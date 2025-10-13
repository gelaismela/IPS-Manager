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
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DeliveryAssignmentService {
    @Autowired
    private DeliveryAssignmentRepo assignmentRepo;
    @Autowired
    private  MaterialRequestRepo requestRepo;
    @Autowired
    private UserRepo userRepo;

    public DeliveryAssignment assignDriver(Long requestId, Long driverId, int assignedQty, LocalDate date) {
        MaterialRequest request = requestRepo.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        Users driver = userRepo.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        // Check not exceeding request quantity
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

        return assignmentRepo.save(assignment);
    }

    public List<DeliveryAssignment> getAssignmentsByRequest(Long requestId) {
        return assignmentRepo.findByMaterialRequestId(requestId).stream().toList();
    }

    public List<DeliveryAssignment> getAssignmentsByDriver(Long driverId) {
        System.out.println("🔍 Fetching deliveries for driverId = " + driverId);
        List<DeliveryAssignment> result = assignmentRepo.findByDriverId(driverId);
        System.out.println("✅ Found " + result.size() + " deliveries");
        return result;
    }

    public DeliveryAssignment updateStatus(Long assignmentId, String newStatus) {
        DeliveryAssignment assignment = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        assignment.setStatus(MaterialRequestStatus.valueOf(newStatus)); // assuming status is a String column in your entity
        return assignmentRepo.save(assignment);
    }
}
