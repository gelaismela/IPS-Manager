# Backend Updates Required for Material Management

## 1. Project Material Management Endpoints

Add these endpoints to your `ProjectController.java`:

```java
@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    @Autowired
    private ProjectService projectService;
    @Autowired
    private ProjectMaterialRepo projectMaterialRepo;
    @Autowired
    private MaterialRepo materialRepo;

    // Add material to existing project
    @PostMapping("/{projectId}/materials/add")
    public ResponseEntity<?> addMaterialToProject(
            @PathVariable Long projectId,
            @RequestBody AddMaterialToProjectDTO dto) {
        try {
            ProjectMaterial pm = projectService.addMaterialToProject(
                projectId,
                dto.getMaterialId(),
                dto.getQuantity()
            );
            return ResponseEntity.ok(pm);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body("Error adding material: " + e.getMessage());
        }
    }

    // Remove material from project
    @DeleteMapping("/{projectId}/materials/{materialId}")
    public ResponseEntity<?> removeMaterialFromProject(
            @PathVariable Long projectId,
            @PathVariable String materialId) {
        try {
            projectService.removeMaterialFromProject(projectId, materialId);
            return ResponseEntity.ok("Material removed successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body("Error removing material: " + e.getMessage());
        }
    }

    // Update material quantity in project
    @PutMapping("/{projectId}/materials/{materialId}")
    public ResponseEntity<?> updateProjectMaterialQuantity(
            @PathVariable Long projectId,
            @PathVariable String materialId,
            @RequestBody UpdateMaterialQuantityDTO dto) {
        try {
            ProjectMaterial pm = projectService.updateMaterialQuantity(
                projectId,
                materialId,
                dto.getQuantity()
            );
            return ResponseEntity.ok(pm);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body("Error updating quantity: " + e.getMessage());
        }
    }
}
```

## 2. DTOs Needed

Create these DTO classes:

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddMaterialToProjectDTO {
    private String materialId;
    private Integer quantity;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMaterialQuantityDTO {
    private Integer quantity;
}
```

## 3. Service Layer Methods

Add to `ProjectService.java`:

```java
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepo projectRepo;
    private final MaterialRepo materialRepo;
    private final ProjectMaterialRepo projectMaterialRepo;

    @Transactional
    public ProjectMaterial addMaterialToProject(Long projectId, String materialId, Integer quantity) {
        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        Material material = materialRepo.findById(materialId)
            .orElseThrow(() -> new RuntimeException("Material not found: " + materialId));

        // Check if already exists
        Optional<ProjectMaterial> existing = projectMaterialRepo
            .findByProjectIdAndMaterialId(projectId, materialId);

        if (existing.isPresent()) {
            // Update quantity if already exists
            ProjectMaterial pm = existing.get();
            pm.setQuantity(pm.getQuantity() + quantity);
            return projectMaterialRepo.save(pm);
        }

        // Create new ProjectMaterial
        ProjectMaterial pm = new ProjectMaterial();
        pm.setProject(project);
        pm.setMaterial(material);
        pm.setQuantity(quantity);
        pm.setQuantityUsed(0);

        return projectMaterialRepo.save(pm);
    }

    @Transactional
    public void removeMaterialFromProject(Long projectId, String materialId) {
        ProjectMaterial pm = projectMaterialRepo
            .findByProjectIdAndMaterialId(projectId, materialId)
            .orElseThrow(() -> new RuntimeException(
                "Material not found in project"
            ));

        // Check if material has been used
        if (pm.getQuantityUsed() > 0) {
            throw new RuntimeException(
                "Cannot remove material that has already been used"
            );
        }

        projectMaterialRepo.delete(pm);
    }

    @Transactional
    public ProjectMaterial updateMaterialQuantity(Long projectId, String materialId, Integer newQuantity) {
        ProjectMaterial pm = projectMaterialRepo
            .findByProjectIdAndMaterialId(projectId, materialId)
            .orElseThrow(() -> new RuntimeException(
                "Material not found in project"
            ));

        // Validate new quantity is not less than used quantity
        if (newQuantity < pm.getQuantityUsed()) {
            throw new RuntimeException(
                "New quantity cannot be less than already used quantity (" +
                pm.getQuantityUsed() + ")"
            );
        }

        pm.setQuantity(newQuantity);
        return projectMaterialRepo.save(pm);
    }
}
```

## 4. Excel Upload Enhancement for Materials

Update `MaterialExcelService.java` to support upsert (update or insert):

```java
@Service
@RequiredArgsConstructor
public class MaterialExcelService {

    private final MaterialRepo materialRepo;

    @Transactional
    public void saveFromExcel(InputStream inputStream) throws IOException {
        Workbook workbook = new XSSFWorkbook(inputStream);
        Sheet sheet = workbook.getSheetAt(0);

        int updatedCount = 0;
        int insertedCount = 0;

        for (int i = 1; i <= sheet.getLastRowNum(); i++) { // Skip header row
            Row row = sheet.getRow(i);
            if (row == null) continue;

            String id = getCellValue(row.getCell(0));
            String name = getCellValue(row.getCell(1));
            String unit = getCellValue(row.getCell(2));

            if (id == null || id.trim().isEmpty()) {
                continue; // Skip rows without ID
            }

            // Check if material exists
            Optional<Material> existingMaterial = materialRepo.findById(id);

            if (existingMaterial.isPresent()) {
                // UPDATE existing material
                Material material = existingMaterial.get();
                material.setName(name);
                material.setUnit(unit);
                materialRepo.save(material);
                updatedCount++;
            } else {
                // INSERT new material
                Material material = new Material();
                material.setId(id);
                material.setName(name);
                material.setUnit(unit);
                materialRepo.save(material);
                insertedCount++;
            }
        }

        workbook.close();
        System.out.println("Materials processed: " + insertedCount + " inserted, " + updatedCount + " updated");
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return null;

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                return String.valueOf((int) cell.getNumericCellValue());
            default:
                return null;
        }
    }
}
```

## 5. Excel Controller Enhancement

Update response to show details:

```java
@RestController
@RequestMapping("/api/excel")
@PreAuthorize("hasRole('dev')")
public class ExcelController {

    private final MaterialExcelService excelService;

    public ExcelController(MaterialExcelService excelService) {
        this.excelService = excelService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadExcel(@RequestParam("file") MultipartFile file) {
        if (!Objects.requireNonNull(file.getOriginalFilename()).endsWith(".xlsx")) {
            return ResponseEntity.badRequest().body("Invalid file type. Please upload .xlsx file");
        }

        try {
            Map<String, Integer> result = excelService.saveFromExcel(file.getInputStream());
            return ResponseEntity.ok(Map.of(
                "message", "File processed successfully",
                "inserted", result.get("inserted"),
                "updated", result.get("updated"),
                "total", result.get("inserted") + result.get("updated")
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error processing file: " + e.getMessage()));
        }
    }
}
```

Update `MaterialExcelService.saveFromExcel()` to return counts:

```java
@Transactional
public Map<String, Integer> saveFromExcel(InputStream inputStream) throws IOException {
    Workbook workbook = new XSSFWorkbook(inputStream);
    Sheet sheet = workbook.getSheetAt(0);

    int updatedCount = 0;
    int insertedCount = 0;

    // ... (same logic as above)

    workbook.close();

    return Map.of(
        "inserted", insertedCount,
        "updated", updatedCount
    );
}
```

## Summary of Changes

### Frontend (Already Done ✅)

- Updated API calls to use new endpoints
- Real-time updates when adding/removing/updating materials
- Better error handling

### Backend (You Need to Add)

1. **ProjectController** - 3 new endpoints for material management
2. **ProjectService** - 3 new methods for business logic
3. **DTOs** - 2 new DTOs for request bodies
4. **MaterialExcelService** - Enhanced to update existing + insert new materials
5. **ExcelController** - Better response with insert/update counts

### Benefits

- ✅ Materials update in real-time (no need to reload page)
- ✅ Excel upload updates existing materials instead of failing
- ✅ Better validation (can't remove used materials, can't reduce quantity below used)
- ✅ Cleaner code separation (frontend handles UI, backend handles business logic)
