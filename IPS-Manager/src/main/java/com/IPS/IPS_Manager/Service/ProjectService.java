package com.IPS.IPS_Manager.Service;

import com.IPS.IPS_Manager.Entity.Material;
import com.IPS.IPS_Manager.Entity.Project;
import com.IPS.IPS_Manager.Entity.ProjectMaterial;
import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Repository.MaterialRepo;
import com.IPS.IPS_Manager.Repository.ProjectMaterialRepo;
import com.IPS.IPS_Manager.Repository.ProjectRepo;
import com.IPS.IPS_Manager.Repository.UserRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProjectService {

    @Autowired
    private ProjectRepo projectRepo;

    @Autowired
    private MaterialRepo materialRepo;

    @Autowired
    private ProjectMaterialRepo projectMaterialRepo;

    @Autowired
    private UserRepo userRepo;

    public Project addProject(Project project) {
        return projectRepo.save(project);
    }

    public List<Project> getAllProjects() {
        return projectRepo.findAll();
    }

    @Transactional
    public ProjectMaterial addMaterialToProject(Long projectId, String materialId, Integer quantity) {
        Project project = projectRepo.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        Material material = materialRepo.findById(materialId)
                .orElseThrow(() -> new RuntimeException("Material not found: " + materialId));

        // Check if material already exists for this project
        Optional<ProjectMaterial> existing = projectMaterialRepo
                .findByProject_IdAndMaterial_Id(projectId, materialId);

        if (existing.isPresent()) {
            // If material already assigned, we simply return it — no updates
            return existing.get();
        }

        // Create new ProjectMaterial
        ProjectMaterial pm = new ProjectMaterial();
        pm.setProject(project);
        pm.setMaterial(material);
        pm.setAssignedQuantity(0);
        pm.setQuantityUsed(0);

        return projectMaterialRepo.save(pm);
    }

    @Transactional
    public void removeMaterialFromProject(Long projectId, String materialId) {
        ProjectMaterial pm = projectMaterialRepo
                .findByProject_IdAndMaterial_Id(projectId, materialId)
                .orElseThrow(() -> new RuntimeException("Material not found in project"));

        if (pm.getQuantityUsed() > 0) {
            throw new RuntimeException("Cannot remove material that has already been used");
        }

        projectMaterialRepo.delete(pm);
    }

    @Transactional
    public ProjectMaterial updateMaterialQuantity(Long projectId, String materialId, Integer newQuantity) {
        ProjectMaterial pm = projectMaterialRepo
                .findByProjectIdAndMaterialId(projectId, materialId)
                .orElseThrow(() -> new RuntimeException("Material not found in project"));

        // Cannot reduce assigned quantity below used amount
        if (newQuantity < pm.getQuantityUsed()) {
            throw new RuntimeException("Assigned quantity cannot be less than already used amount");
        }

        pm.setAssignedQuantity(newQuantity);
        return projectMaterialRepo.save(pm);
    }

    @Transactional
    public Project assignProjectManager(Long projectId, Long projectManagerId) {
        Project project = projectRepo.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        Users projectManager = userRepo.findById(projectManagerId)
                .orElseThrow(() -> new RuntimeException("User not found: " + projectManagerId));

        // Optional: Check if user has project_manager role
        if (!"project_manager".equals(projectManager.getRole())) {
            throw new RuntimeException("User must have project_manager role");
        }

        project.setProjectManager(projectManager);
        return projectRepo.save(project);
    }

    public List<Project> getProjectsByManagerId(Long managerId) {
        return projectRepo.findByProjectManagerId(managerId);
    }
}
