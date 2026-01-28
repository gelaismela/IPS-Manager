package com.IPS.IPS_Manager.Service.Excel;

import com.IPS.IPS_Manager.Entity.Material;
import com.IPS.IPS_Manager.Entity.Project;
import com.IPS.IPS_Manager.Entity.ProjectMaterial;
import com.IPS.IPS_Manager.Repository.MaterialRepo;
import com.IPS.IPS_Manager.Repository.ProjectMaterialRepo;
import com.IPS.IPS_Manager.Repository.ProjectRepo;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

@Service
public class ProjectMaterialExcelService {

    @Autowired
    private ProjectRepo projectRepo;

    @Autowired
    private MaterialRepo materialRepo;

    @Autowired
    private ProjectMaterialRepo projectMaterialRepo;

    public Map<String, Object> saveProjectMaterialsFromExcel(InputStream is, Long projectId) throws IOException {
        // Get project
        Project project = projectRepo.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        Workbook workbook = new XSSFWorkbook(is);
        Sheet sheet = workbook.getSheetAt(0);

        int added = 0;
        int updated = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue; // Skip header

            try {
                String materialCode = getCellValueAsString(row, 0);
                int quantity = (int) getCellValueAsNumber(row, 3); // Column index 3 for "საპროექტო"

                if (materialCode == null || materialCode.trim().isEmpty()) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": Missing material code");
                    failed++;
                    continue;
                }

                // Find material
                Optional<Material> materialOpt = materialRepo.findById(materialCode);
                if (!materialOpt.isPresent()) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": Material " + materialCode + " not found");
                    failed++;
                    continue;
                }

                Material material = materialOpt.get();

                // Check if ProjectMaterial already exists using your existing method
                Optional<ProjectMaterial> existingPM = projectMaterialRepo.findByProject_IdAndMaterial_Id(projectId, materialCode);

                if (existingPM.isPresent()) {
                    // UPDATE existing
                    ProjectMaterial pm = existingPM.get();
                    pm.setQuantityUsed(quantity);
                    projectMaterialRepo.save(pm);
                    updated++;
                } else {
                    // ADD new
                    ProjectMaterial pm = new ProjectMaterial();
                    pm.setProject(project);
                    pm.setMaterial(material);
                    pm.setQuantityUsed(quantity);
                    projectMaterialRepo.save(pm);
                    added++;
                }

            } catch (Exception e) {
                errors.add("Row " + (row.getRowNum() + 1) + ": " + e.getMessage());
                failed++;
            }
        }

        workbook.close();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("added", added);
        response.put("updated", updated);
        response.put("failed", failed);
        response.put("errors", errors);

        return response;
    }

    private String getCellValueAsString(Row row, int cellIndex) {
        try {
            if (row.getCell(cellIndex) == null) return "";
            return row.getCell(cellIndex).getStringCellValue();
        } catch (Exception e) {
            return "";
        }
    }

    private double getCellValueAsNumber(Row row, int cellIndex) {
        try {
            if (row.getCell(cellIndex) == null) return 0;
            return row.getCell(cellIndex).getNumericCellValue();
        } catch (Exception e) {
            return 0;
        }
    }
}
