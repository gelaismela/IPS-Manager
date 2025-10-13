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
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MaterialRequestService {

    private final MaterialRequestRepo requestRepo;
    private final MaterialRepo materialRepo;
    private final ProjectRepo projectRepo;
    private final ProjectMaterialRepo projectMaterialRepo;


        public MaterialRequest createRequest(Long projectId, String materialId, int qty) {
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

            return requestRepo.save(request);
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

        return requestRepo.save(req);
    }



    // Mark delivered
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
        return requestRepo.save(request);
    }



    public List<MaterialRequest> getPendingRequestsForProject(Long projectId) {
        return requestRepo.findByProjectIdAndStatus(projectId, MaterialRequestStatus.PENDING);
    }

    public List<MaterialRequest> getAllPendingRequests() {
        return requestRepo.findByStatus(MaterialRequestStatus.PENDING);
    }

    public Optional<MaterialRequest> getRequestById(Long id) {
        return requestRepo.findById(id);
    }

    public List<MaterialRequest> getAllRequestsForProject(Long projectId) {
        return requestRepo.findByProject_Id(projectId);
    }

}
