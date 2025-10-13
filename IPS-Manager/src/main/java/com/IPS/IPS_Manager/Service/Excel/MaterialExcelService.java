package com.IPS.IPS_Manager.Service.Excel;

import com.IPS.IPS_Manager.Entity.Material;
import com.IPS.IPS_Manager.Repository.MaterialRepo;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

@Service
public class MaterialExcelService {

    private final MaterialRepo materialRepository;

    public MaterialExcelService(MaterialRepo materialRepository) {
        this.materialRepository = materialRepository;
    }

    public void saveFromExcel(InputStream is) throws IOException {
        Workbook workbook = new XSSFWorkbook(is);
        Sheet sheet = workbook.getSheetAt(0);

        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue; // Skip header

            Material material = new Material();
            material.setId(row.getCell(1).getStringCellValue());
            material.setName(row.getCell(2).getStringCellValue());
            material.setUnit(row.getCell(3).getStringCellValue());
            material.setQuantity((int) row.getCell(4).getNumericCellValue());

            materialRepository.save(material);
        }

        workbook.close();
    }
}