package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.Service.DeliveryAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/deliveries")
@RequiredArgsConstructor
public class DeliveryAssignmentController {

    @Autowired
    private DeliveryAssignmentService assignmentService;

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



}