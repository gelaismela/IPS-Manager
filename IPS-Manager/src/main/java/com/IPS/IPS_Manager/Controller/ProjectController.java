package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.DTO.AddMaterialToProjectDTO;
import com.IPS.IPS_Manager.DTO.AssignProjectManagerDTO;
import com.IPS.IPS_Manager.DTO.ProjectWithMaterialsRequest;
import com.IPS.IPS_Manager.DTO.UpdateMaterialQuantityDTO;
import com.IPS.IPS_Manager.Entity.*;
import com.IPS.IPS_Manager.Repository.MaterialRepo;
import com.IPS.IPS_Manager.Repository.ProjectMaterialRepo;
import com.IPS.IPS_Manager.Repository.ProjectRepo;
import com.IPS.IPS_Manager.Repository.UserRepo;
import com.IPS.IPS_Manager.Service.ProjectMaterialService;
import com.IPS.IPS_Manager.Service.ProjectService;
import com.IPS.IPS_Manager.Service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;


@RestController
@RequestMapping("/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserRepo repo;

    @Autowired
    private ProjectRepo projectRepo;

    @Autowired
    private ProjectMaterialService projectMaterialService;


    @PostMapping("/add")
    public ResponseEntity<Project> createProject(@RequestBody Project project) {
        Project saved = projectService.addProject(project);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/addAll")
    public ResponseEntity<List<Project>> createProjects(@RequestBody List<Project> projects){
        List<Project> saved = projects.stream()
                .map(projectService::addProject)
                .toList();
        return ResponseEntity.ok(saved);
    }


     @GetMapping("/all")
     public ResponseEntity<List<Project>> getProjects() {
         return ResponseEntity.ok(projectService.getAllProjects());
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
        try {
            List<ProjectMaterial> materials = projectMaterialService.getMaterialsByProject(projectId);
            return ResponseEntity.ok(materials);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

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

    // Delete a project and all its corresponding material assignments
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable Long id) {
        try {
            projectService.deleteProjectWithMaterials(id);
            return ResponseEntity.noContent().build(); // Returns a clean HTTP 204 status
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error deleting project: " + e.getMessage());
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

    // Assign project manager to a project
    @PutMapping("/{projectId}/assign-manager")
    public ResponseEntity<?> assignProjectManager(
            @PathVariable Long projectId,
            @RequestBody AssignProjectManagerDTO dto) {
        try {
            Project project = projectService.assignProjectManager(projectId, dto.getProjectManagerId());
            return ResponseEntity.ok(project);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Error assigning project manager: " + e.getMessage());
        }
    }

    @GetMapping("/my-projects")
    @PreAuthorize("hasRole('project_manager')")
    public ResponseEntity<List<Project>> getMyProjects(Principal principal) {
        // Get email from JWT token
        String email = principal.getName();

        // Find the user by email to get their ID
        Users currentUser = repo.findByMail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Find projects where project_manager_id = currentUser.getId()
        List<Project> projects = projectRepo.findByProjectManagerId(currentUser.getId());
        return ResponseEntity.ok(projects);
    }
}