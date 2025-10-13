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
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;

@Service
public class ProjectMaterialExcelService {

    private final ProjectRepo projectRepo;
    private final MaterialRepo materialRepo;
    private final ProjectMaterialRepo projectMaterialRepo;

    public ProjectMaterialExcelService(ProjectRepo projectRepo, MaterialRepo materialRepo, ProjectMaterialRepo projectMaterialRepo) {
        this.projectRepo = projectRepo;
        this.materialRepo = materialRepo;
        this.projectMaterialRepo = projectMaterialRepo;
    }

    public void saveProjectMaterialsFromExcel(InputStream is) throws IOException {
        Workbook workbook = new XSSFWorkbook(is);
        Sheet sheet = workbook.getSheetAt(0);

        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue; // skip header

            String projectCode = row.getCell(0).getStringCellValue();
            String materialId = row.getCell(1).getStringCellValue();
            int quantityUsed = (int) row.getCell(2).getNumericCellValue();

            Optional<Project> projectOpt = projectRepo.findByProjectCode(projectCode);
            Optional<Material> materialOpt = materialRepo.findById(materialId);

            if (projectOpt.isPresent() && materialOpt.isPresent()) {
                ProjectMaterial pm = new ProjectMaterial();
                pm.setProject(projectOpt.get());
                pm.setMaterial(materialOpt.get());
                pm.setQuantityUsed(quantityUsed);

                projectMaterialRepo.save(pm);
            } else {
                // Optionally handle missing project or material
                System.out.println("Missing project or material for row " + row.getRowNum());
            }
        }

        workbook.close();
    }
}
