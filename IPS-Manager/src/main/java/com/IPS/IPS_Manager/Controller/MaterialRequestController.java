package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.DTO.AssignRequestDTO;
import com.IPS.IPS_Manager.DTO.CreateRequestDTO;
import com.IPS.IPS_Manager.Entity.DeliveryAssignment;
import com.IPS.IPS_Manager.Entity.MaterialRequest;
import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Enum.MaterialRequestStatus;
import com.IPS.IPS_Manager.Repository.MaterialRequestRepo;
import com.IPS.IPS_Manager.Repository.UserRepo;
import com.IPS.IPS_Manager.Service.DeliveryAssignmentService;
import com.IPS.IPS_Manager.Service.MaterialRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/material-requests")
@RequiredArgsConstructor
public class MaterialRequestController {

    @Autowired
    private  MaterialRequestService requestService;
    @Autowired
    private MaterialRequestRepo requestRepo;
    @Autowired
    private  DeliveryAssignmentService assignmentService;
    @Autowired
    private  UserRepo userRepo;

    // 🔹 Get specific request by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getRequestById(@PathVariable Long id) {
        return requestService.getRequestById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 🔹 Worker creates request
    @PostMapping("/request")
    public ResponseEntity<?> createRequest(@RequestBody CreateRequestDTO dto) {
        try {
            MaterialRequest req = requestService.createRequest(dto.getProjectId(), dto.getMaterialId(), dto.getRequestedQuantity());
            return ResponseEntity.ok(req);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error creating request: " + e.getMessage());
        }
    }

    // 🔹 Head assigns a driver and quantity (multiple allowed for same material)
    @PostMapping("/{id}/assign")
    public ResponseEntity<?> assignDriver(@PathVariable Long id, @RequestBody AssignRequestDTO dto) {
        try {
            DeliveryAssignment assignment = assignmentService.assignDriver(
                    id,
                    Long.valueOf(dto.getDriverId()),
                    dto.getAssignedQuantity(),
                    dto.getDeliveryDate()
            );
            return ResponseEntity.ok(assignment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error assigning driver: " + e.getMessage());
        }
    }

    // 🔹 Mark a request as delivered
    @PutMapping("/{id}/deliver")
    public ResponseEntity<?> markDelivered(@PathVariable Long id) {
        try {
            MaterialRequest req = requestService.markDelivered(id);
            return ResponseEntity.ok(req);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error marking delivered: " + e.getMessage());
        }
    }

    // 🔹 List pending requests for a project
    @GetMapping("/project/{projectId}/pending")
    public ResponseEntity<?> getPendingByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(requestService.getPendingRequestsForProject(projectId));
    }

    // 🔹 List ALL pending requests
    @GetMapping("/pending")
    public ResponseEntity<?> getAllPendingRequests() {
        return ResponseEntity.ok(requestService.getAllPendingRequests());
    }

    // 🔹 List ALL requests for a specific project
    @GetMapping("/project/{projectId}/all")
    public ResponseEntity<?> getAllRequestsForProject(@PathVariable Long projectId) {
        try {
            return ResponseEntity.ok(requestService.getAllRequestsForProject(projectId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching project requests: " + e.getMessage());
        }
    }

    // 🔹 List all driver assignments for a specific request
    @GetMapping("/{id}/assignments")
    public ResponseEntity<?> getAssignmentsForRequest(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.getAssignmentsByRequest(id));
    }


}
