package com.IPS.IPS_Manager.Service.Excel;

import com.IPS.IPS_Manager.Entity.Project;
import com.IPS.IPS_Manager.Repository.ProjectRepo;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

@Service
public class ProjectExcelService {

    private final ProjectRepo projectRepo;

    public ProjectExcelService(ProjectRepo projectRepo) {
        this.projectRepo = projectRepo;
    }

    public void saveProjectsFromExcel(InputStream is) throws IOException {
        Workbook workbook = new XSSFWorkbook(is);
        Sheet sheet = workbook.getSheetAt(0);

        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue; // skip header

            Project project = new Project();

            // Assuming columns: 0 = projectCode, 1 = name, 2 = address
            project.setProjectCode(row.getCell(0).getStringCellValue());
            project.setName(row.getCell(1).getStringCellValue());
            project.setAddress(row.getCell(2).getStringCellValue());

            projectRepo.save(project);
        }

        workbook.close();
    }
}
