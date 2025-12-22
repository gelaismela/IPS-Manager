package com.IPS.IPS_Manager.Service;


import com.IPS.IPS_Manager.DTO.CreateRequestDTO;
import com.IPS.IPS_Manager.DTO.ProjectWithMaterialsRequest;
import com.IPS.IPS_Manager.Entity.*;
import com.IPS.IPS_Manager.Repository.MaterialRepo;
import com.IPS.IPS_Manager.Repository.ProjectMaterialRepo;
import com.IPS.IPS_Manager.Repository.ProjectRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectMaterialService {

    @Autowired
    private ProjectRepo projectRepo;

    @Autowired
    private ProjectMaterialRepo projectMaterialRepo;

    @Autowired
    private MaterialRepo materialRepo;

    @Autowired
    private MaterialRequestService materialRequestService;

    @Transactional
    public Project createProjectWithMaterials(Project project, List<ProjectMaterial> materials) {
        Project savedProject = projectRepo.save(project);

        for (ProjectMaterial req : materials) {
            String materialId = req.getMaterial().getId();

            Material material = materialRepo.findById(materialId)
                    .orElseThrow(() -> new RuntimeException("Material not found: " + materialId));

            ProjectMaterial pm = new ProjectMaterial();
            pm.setProject(savedProject);
            pm.setMaterial(material);
            pm.setAssignedQuantity(req.getAssignedQuantity());
            pm.setQuantityUsed(0);

            projectMaterialRepo.save(pm);
        }

        return savedProject;
    }

    public boolean updateQuantityUsed(Long projectMaterialId, int newUsedQuantity) {
        ProjectMaterial pm = projectMaterialRepo.findById(projectMaterialId)
                .orElseThrow(() -> new RuntimeException("Project material not found"));

        if (newUsedQuantity > pm.getAssignedQuantity()) {
            return false; // exceeding limit
        }

        pm.setQuantityUsed(newUsedQuantity);
        projectMaterialRepo.save(pm);
        return true;
    }

    // ✅ Worker creates new material request for project
    public MaterialRequest createMaterialRequest(Long projectId, String materialId, int quantity, Users user) {
        return materialRequestService.createRequest(projectId, materialId, quantity, user);
    }

    public List<ProjectMaterial> getMaterialsByProject(Long projectId) {
        return projectMaterialRepo.findByProject_Id(projectId);
    }

    public ProjectMaterial getMaterialByProjectAndMaterial(Long projectId, String materialId) {
        return projectMaterialRepo.findByProjectIdAndMaterialId(projectId, materialId)
                .orElse(null);
    }

    public ProjectMaterial save(ProjectMaterial pm) {
        return projectMaterialRepo.save(pm);
    }
}