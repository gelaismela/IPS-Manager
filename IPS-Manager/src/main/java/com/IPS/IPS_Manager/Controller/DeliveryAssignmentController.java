package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.Entity.DeliveryAssignment;
import com.IPS.IPS_Manager.Entity.DeliveryPhoto;
import com.IPS.IPS_Manager.Repository.DeliveryAssignmentRepo;
import com.IPS.IPS_Manager.Repository.DeliveryPhotoRepo;
import com.IPS.IPS_Manager.Service.DeliveryAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/deliveries")
@RequiredArgsConstructor
public class DeliveryAssignmentController {

    @Autowired
    private DeliveryAssignmentService assignmentService;

    @Autowired
    private DeliveryPhotoRepo photoRepo;

    @Autowired
    private DeliveryAssignmentRepo assignmentRepo;

    @GetMapping("/request/{requestId}")
    public ResponseEntity<?> getAssignmentsByRequest(@PathVariable Long requestId) {
        return ResponseEntity.ok(assignmentService.getAssignmentsByRequest(requestId));
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<?> getAssignmentsByDriver(@PathVariable Long driverId) {
        System.out.println("📦 GET /deliveries/driver/" + driverId);
        return ResponseEntity.ok(assignmentService.getAssignmentsByDriver(driverId));
    }

    @PutMapping("/{assignmentId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long assignmentId,
            @RequestBody Map<String, String> payload) {

        String newStatus = payload.get("status");
        return ResponseEntity.ok(assignmentService.updateStatus(assignmentId, newStatus));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeliveryAssignment(@PathVariable Long id) {
        try {
            // 1. Find the assignment to check if it exists
            DeliveryAssignment assignment = assignmentRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Delivery Assignment not found"));

            // 2. Cascade cleanup: Remove linked photos from DB first to preserve integrity constraints
            List<DeliveryPhoto> linkedPhotos = photoRepo.findByDeliveryAssignmentId(id);
            if (!linkedPhotos.isEmpty()) {
                photoRepo.deleteAll(linkedPhotos);
            }

            // 3. Complete the primary record deletion
            assignmentRepo.delete(assignment);

            return ResponseEntity.noContent().build(); // Returns 204 status code safely
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build(); // Returns 404 if ID missing
        }
    }

}