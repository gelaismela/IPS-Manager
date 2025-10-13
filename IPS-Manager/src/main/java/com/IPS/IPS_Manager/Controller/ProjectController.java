package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.DTO.ProjectWithMaterialsRequest;
import com.IPS.IPS_Manager.Entity.Material;
import com.IPS.IPS_Manager.Entity.MaterialRequest;
import com.IPS.IPS_Manager.Entity.Project;
import com.IPS.IPS_Manager.Entity.ProjectMaterial;
import com.IPS.IPS_Manager.Service.ProjectMaterialService;
import com.IPS.IPS_Manager.Service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.web.savedrequest.SavedCookie;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/projects")
@PreAuthorize("hasRole('dev')")

public class ProjectController {

    @Autowired
    private ProjectService service;

    @Autowired
    private ProjectMaterialService projectMaterialService;

    @PostMapping("/add")
    public ResponseEntity<Project> createProject(@RequestBody Project project) {
        Project saved = service.addProject(project);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/addAll")
    public List<Project> createProjects(@RequestBody List<Project> projects){
        return projects.stream().map(project-> createProject(project).getBody()).toList();
    }

    @GetMapping("/all")
    public ResponseEntity<List<Project>> getProjects() {
        return ResponseEntity.ok(service.getAllProjects());
    }



    @PostMapping("/with-materials")
    public ResponseEntity<Project> createProjectWithMaterials(
            @RequestBody ProjectWithMaterialsRequest request) {
        Project savedProject = projectMaterialService.createProjectWithMaterials(
                request.getProject(), request.getMaterials());
        return ResponseEntity.ok(savedProject);
    }


    @GetMapping("/{projectId}/materials")
    public ResponseEntity<?> getMaterialsByProject(@PathVariable Long projectId) {
        System.out.println("🔍 Incoming request for projectId: " + projectId);

        try {
            List<ProjectMaterial> materials = projectMaterialService.getMaterialsByProject(projectId);
            System.out.println("✅ Found materials: " + materials.size());
            return ResponseEntity.ok(materials);
        } catch (Exception e) {
            System.err.println("❌ Error while fetching materials: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }


    @PutMapping("/{projectId}/materials/use")
    public ResponseEntity<String> useMaterial(
            @PathVariable Long projectId,
            @RequestBody Map<String, Object> payload) {

        String materialId = (String) payload.get("materialId");
        Integer used = (Integer) payload.get("used");

        if (materialId == null || used == null) {
            return ResponseEntity.badRequest().body("Missing materialId or used in request");
        }

        if (used < 0) {
            return ResponseEntity.badRequest().body("Used quantity cannot be negative");
        }

        try {
            // Fetch ProjectMaterial by projectId and materialId
            ProjectMaterial pm = projectMaterialService.getMaterialByProjectAndMaterial(projectId, materialId);
            if (pm == null) {
                System.out.println("❌ Material not found for projectId=" + projectId + " and materialId=" + materialId);
                return ResponseEntity.badRequest().body("Material not found for this project");
            }

            // Check limit
            if (pm.getQuantityUsed() + used > pm.getAssignedQuantity()) {
                System.out.println("⚠️ Exceeding assigned quantity! Assigned=" + pm.getAssignedQuantity()
                        + ", AlreadyUsed=" + pm.getQuantityUsed() + ", TryingToUse=" + used);
                return ResponseEntity.badRequest().body("Cannot use more than assigned quantity");
            }

            // Update quantityUsed
            pm.setQuantityUsed(pm.getQuantityUsed() + used);
            projectMaterialService.save(pm);
            System.out.println("✅ Updated quantityUsed for materialId=" + materialId + " in projectId=" + projectId
                    + ". New quantityUsed=" + pm.getQuantityUsed());

            // ALSO create MaterialRequest for head/driver
            Project project = pm.getProject();
            MaterialRequest request = projectMaterialService.createMaterialRequest(
                    project.getId(),
                    materialId,
                    used
            );
            System.out.println("📩 MaterialRequest created with id=" + request.getId());

            return ResponseEntity.ok("Quantity updated and material request created (id=" + request.getId() + ")");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }


}