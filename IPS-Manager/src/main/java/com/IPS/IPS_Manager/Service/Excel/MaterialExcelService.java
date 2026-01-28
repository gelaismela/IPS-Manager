package com.IPS.IPS_Manager.Service.Excel;

import com.IPS.IPS_Manager.Entity.Material;
import com.IPS.IPS_Manager.Repository.MaterialRepo;
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
public class MaterialExcelService {

    @Autowired
    private MaterialRepo materialRepository;

    public Map<String, Object> saveFromExcel(InputStream is) throws IOException {
        Workbook workbook = new XSSFWorkbook(is);
        Sheet sheet = workbook.getSheetAt(0);

        int added = 0;
        int updated = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue; // Skip header

            try {
                // Read cells safely
                String id = getCellValueAsString(row, 1);
                String name = getCellValueAsString(row, 2);
                String unit = getCellValueAsString(row, 3);
                int quantity = (int) getCellValueAsNumber(row, 4);

                if (id == null || id.trim().isEmpty()) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": Missing material code");
                    failed++;
                    continue;
                }

                // Check if material exists
                Optional<Material> existing = materialRepository.findById(id);

                if (existing.isPresent()) {
                    // UPDATE existing material
                    Material material = existing.get();
                    material.setName(name);
                    material.setUnit(unit);
                    material.setQuantity(quantity);
                    materialRepository.save(material);
                    updated++;
                } else {
                    // ADD new material
                    Material material = new Material();
                    material.setId(id);
                    material.setName(name);
                    material.setUnit(unit);
                    material.setQuantity(quantity);
                    materialRepository.save(material);
                    added++;
                }

            } catch (Exception e) {
                errors.add("Row " + (row.getRowNum() + 1) + ": " + e.getMessage());
                failed++;
            }
        }

        workbook.close();

        // Create response
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