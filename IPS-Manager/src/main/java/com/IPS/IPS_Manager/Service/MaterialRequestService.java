package com.IPS.IPS_Manager.Service;

import com.IPS.IPS_Manager.DTO.AssignRequestDTO;
import com.IPS.IPS_Manager.DTO.CreateRequestDTO;
import com.IPS.IPS_Manager.Entity.*;
import com.IPS.IPS_Manager.Enum.MaterialRequestStatus;
import com.IPS.IPS_Manager.Repository.MaterialRepo;
import com.IPS.IPS_Manager.Repository.MaterialRequestRepo;
import com.IPS.IPS_Manager.Repository.ProjectMaterialRepo;
import com.IPS.IPS_Manager.Repository.ProjectRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MaterialRequestService {

    private final MaterialRequestRepo requestRepo;
    private final MaterialRepo materialRepo;
    private final ProjectRepo projectRepo;
    private final ProjectMaterialRepo projectMaterialRepo;

    // ✅ ADD THIS
    private final PushNotificationService pushNotificationService;

    public MaterialRequest createRequest(Long projectId, String materialId, int qty, Users createdBy) {
        Project project = projectRepo.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        Material material = materialRepo.findById(materialId)
                .orElseThrow(() -> new RuntimeException("Material not found"));

        MaterialRequest request = new MaterialRequest();
        request.setProject(project);
        request.setMaterial(material);
        request.setRequestedQuantity(qty);
        request.setRequestDate(LocalDate.now());
        request.setStatus(MaterialRequestStatus.PENDING);
        request.setCreatedBy(createdBy);

        MaterialRequest saved = requestRepo.save(request);

        // ✅ Notify HEAD_DRIVER about new request
        pushNotificationService.sendToRole(
                "HEAD_DRIVER",
                "🔔 New Material Request",
                String.format("Project %s requested %d x %s",
                        project.getName(), qty, material.getName()),
                Map.of(
                        "type", "material_request_created",
                        "requestId", saved.getId().toString(),
                        "projectId", projectId.toString()
                )
        );

        return saved;
    }

    // ✅ RESTORE THIS - Get requests for projects managed by a project manager
    public List<MaterialRequest> getRequestsByProjectManagerId(Long projectManagerId) {
        return requestRepo.findByProject_ProjectManager_Id(projectManagerId);
    }

    @Transactional
    public MaterialRequest assignRequest(Long requestId, AssignRequestDTO dto, Users driver) {
        MaterialRequest req = requestRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (dto.getAssignedQuantity() > req.getRequestedQuantity()) {
            throw new RuntimeException("Assigned quantity cannot exceed requested quantity");
        }

        req.setAssignedQuantity(dto.getAssignedQuantity());
        req.setDriver(driver);
        req.setDeliveryDate(dto.getDeliveryDate());
        req.setStatus(MaterialRequestStatus.ASSIGNED);

        MaterialRequest saved = requestRepo.save(req);

        Material material = materialRepo.findById(req.getMaterial().getId())
                .orElseThrow(() -> new RuntimeException("Material not found"));
        int currentStock = material.getQuantity();
        material.setQuantity(Math.max(0, currentStock - dto.getAssignedQuantity()));
        materialRepo.save(material);

        // ✅ Notify driver about assignment
        pushNotificationService.sendToUser(
                driver,
                "🚚 New Delivery Assignment",
                String.format("You've been assigned to deliver %d x %s to %s",
                        dto.getAssignedQuantity(),
                        req.getMaterial().getName(),
                        req.getProject().getName()),
                Map.of(
                        "type", "delivery_assigned",
                        "requestId", requestId.toString(),
                        "deliveryDate", dto.getDeliveryDate().toString()
                )
        );

        // ✅ Notify project manager too
        if (req.getProject().getProjectManager() != null) {
            pushNotificationService.sendToUser(
                    req.getProject().getProjectManager(),
                    "✅ Driver Assigned",
                    String.format("Driver %s assigned to deliver %s",
                            driver.getName(), req.getMaterial().getName()),
                    Map.of("type", "driver_assigned", "requestId", requestId.toString())
            );
        }

        return saved;
    }



    @Transactional
    public MaterialRequest markDelivered(Long requestId) {
        MaterialRequest request = requestRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        ProjectMaterial pm = projectMaterialRepo.findByProjectIdAndMaterialId(
                request.getProject().getId(), request.getMaterial().getId()
        ).orElseThrow(() -> new RuntimeException("ProjectMaterial not found"));

        pm.setQuantityUsed(pm.getQuantityUsed() + request.getAssignedQuantity());
        projectMaterialRepo.save(pm);

        request.setStatus(MaterialRequestStatus.SENT);
        MaterialRequest saved = requestRepo.save(request);

        // ✅ Notify project manager
        if (request.getProject().getProjectManager() != null) {
            pushNotificationService.sendToUser(
                    request.getProject().getProjectManager(),
                    "📦 Delivery Completed",
                    String.format("%d x %s delivered to %s",
                            request.getAssignedQuantity(),
                            request.getMaterial().getName(),
                            request.getProject().getName()),
                    Map.of("type", "delivery_completed", "requestId", requestId.toString())
            );
        }

        // ✅ Notify HEAD_DRIVER too
        pushNotificationService.sendToRole(
                "HEAD_DRIVER",
                "✅ Delivery Completed",
                String.format("Delivery to %s completed successfully",
                        request.getProject().getName()),
                Map.of("type", "delivery_completed", "requestId", requestId.toString())
        );

        return saved;
    }

    // ✅ RESTORE THIS
    public List<MaterialRequest> getPendingRequestsForProject(Long projectId) {
        return requestRepo.findByProjectIdAndStatus(projectId, MaterialRequestStatus.PENDING);
    }

    // ✅ RESTORE THIS
    public List<MaterialRequest> getAllPendingRequests() {
        return requestRepo.findByStatus(MaterialRequestStatus.PENDING);
    }

    // ✅ RESTORE THIS
    public Optional<MaterialRequest> getRequestById(Long id) {
        return requestRepo.findById(id);
    }

    // ✅ RESTORE THIS
    public List<MaterialRequest> getAllRequestsForProject(Long projectId) {
        return requestRepo.findByProject_Id(projectId);
    }
}