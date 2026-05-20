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
        // ✅ Double-check your repo method casing: typically using Project_Id and Material_Id matches JPA standards safely
        ProjectMaterial pm = projectMaterialRepo
                .findByProject_IdAndMaterial_Id(projectId, materialId)
                .orElseThrow(() -> new RuntimeException("Material not found in project"));

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

        // ✅ FIXED: Checks the collection roles instead of assuming a single string field exists
        boolean isManager = projectManager.getRoles() != null && projectManager.getRoles().stream()
                .anyMatch(role -> "project_manager".equalsIgnoreCase(role));

        if (!isManager) {
            throw new RuntimeException("User must have project_manager role");
        }

        project.setProjectManager(projectManager);
        return projectRepo.save(project);
    }

    public List<Project> getProjectsByManagerId(Long managerId) {
        return projectRepo.findByProjectManagerId(managerId);
    }

    @Transactional
    public void deleteProjectWithMaterials(Long projectId) {
        // 1. Verify the project exists first
        Project project = projectRepo.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found with ID: " + projectId));

        // 2. Fetch all material associations tied to this project
        List<ProjectMaterial> linkedMaterials = projectMaterialRepo.findByProject_Id(projectId);

        // 3. Clear them out of the project_materials table to prevent foreign key errors
        if (!linkedMaterials.isEmpty()) {
            projectMaterialRepo.deleteAll(linkedMaterials);
        }

        // 4. Safely drop the main project record
        projectRepo.delete(project);
    }
}