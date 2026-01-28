package com.IPS.IPS_Manager.Service;

import com.IPS.IPS_Manager.Entity.DeliveryAssignment;
import com.IPS.IPS_Manager.Entity.MaterialRequest;
import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Enum.MaterialRequestStatus;
import com.IPS.IPS_Manager.Repository.DeliveryAssignmentRepo;
import com.IPS.IPS_Manager.Repository.MaterialRequestRepo;
import com.IPS.IPS_Manager.Repository.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DeliveryAssignmentService {
    @Autowired
    private DeliveryAssignmentRepo assignmentRepo;
    @Autowired
    private MaterialRequestRepo requestRepo;
    @Autowired
    private UserRepo userRepo;

    // ✅ ADD THIS
    @Autowired
    private PushNotificationService pushNotificationService;

    public DeliveryAssignment assignDriver(Long requestId, Long driverId, int assignedQty, LocalDate date) {
        MaterialRequest request = requestRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        Users driver = userRepo.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        int alreadyAssigned = assignmentRepo.findByMaterialRequestId(requestId)
                .stream()
                .mapToInt(DeliveryAssignment::getAssignedQuantity)
                .sum();

        if (alreadyAssigned + assignedQty > request.getRequestedQuantity()) {
            throw new RuntimeException("Assigned quantity exceeds requested quantity");
        }

        DeliveryAssignment assignment = new DeliveryAssignment();
        assignment.setMaterialRequest(request);
        assignment.setDriver(driver);
        assignment.setAssignedQuantity(assignedQty);
        assignment.setDeliveryDate(date);
        assignment.setStatus(MaterialRequestStatus.PENDING);

        DeliveryAssignment saved = assignmentRepo.save(assignment);

        // ✅ Notify driver
        pushNotificationService.sendToUser(
                driver,
                "🚚 New Delivery Assignment",
                String.format("Deliver %d x %s to %s on %s",
                        assignedQty,
                        request.getMaterial().getName(),
                        request.getProject().getName(),
                        date.toString()),
                Map.of(
                        "type", "delivery_assigned",
                        "assignmentId", saved.getId().toString(),
                        "requestId", requestId.toString()
                )
        );

        return saved;
    }

    // ✅ RESTORE THIS METHOD
    public List<DeliveryAssignment> getAssignmentsByRequest(Long requestId) {
        return assignmentRepo.findByMaterialRequestId(requestId).stream().toList();
    }

    // ✅ RESTORE THIS METHOD
    public List<DeliveryAssignment> getAssignmentsByDriver(Long driverId) {
        System.out.println("🔍 Fetching deliveries for driverId = " + driverId);
        List<DeliveryAssignment> result = assignmentRepo.findByDriverId(driverId);
        System.out.println("✅ Found " + result.size() + " deliveries");
        return result;
    }

    public DeliveryAssignment updateStatus(Long assignmentId, String newStatus) {
        DeliveryAssignment assignment = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        MaterialRequestStatus oldStatus = assignment.getStatus();
        assignment.setStatus(MaterialRequestStatus.valueOf(newStatus));
        DeliveryAssignment saved = assignmentRepo.save(assignment);

        // ✅ Notify based on status change
        if (MaterialRequestStatus.SENT.equals(saved.getStatus())) {
            // Delivery completed
            MaterialRequest request = assignment.getMaterialRequest();

            if (request.getProject().getProjectManager() != null) {
                pushNotificationService.sendToUser(
                        request.getProject().getProjectManager(),
                        "✅ Delivery Completed",
                        String.format("Driver %s delivered %d x %s",
                                assignment.getDriver().getName(),
                                assignment.getAssignedQuantity(),
                                request.getMaterial().getName()),
                        Map.of("type", "delivery_completed", "assignmentId", assignmentId.toString())
                );
            }

            pushNotificationService.sendToRole("HEAD_DRIVER",
                    "📦 Delivery Completed",
                    String.format("Delivery to %s completed", request.getProject().getName()),
                    Map.of("type", "delivery_completed")
            );
        }

        return saved;
    }

    public List<DeliveryAssignment> getAllAssignment() {
        return assignmentRepo.findAll();
    }
}