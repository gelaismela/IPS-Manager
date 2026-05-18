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

    @Autowired
    private PushNotificationService pushNotificationService;

    @Autowired
    private MailService mailService;

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

        // Notify driver via Push
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

        // Notify driver via Email
        if (driver.getMail() != null && !driver.getMail().isEmpty()) {
            String subject = "🚚 New Delivery Assignment Assigned";
            String body = String.format("Hello %s,\n\nYou have been assigned a new delivery task.\n\n" +
                            "• Material: %d x %s\n" +
                            "• Destination Project: %s\n" +
                            "• Scheduled Date: %s\n\n" +
                            "Best regards,\nIPS Fleet Dispatch Team",
                    driver.getName(), assignedQty, request.getMaterial().getName(), request.getProject().getName(), date.toString());

            mailService.sendMail(driver.getMail(), subject, body);
        }

        return saved;
    }

    public List<DeliveryAssignment> getAssignmentsByRequest(Long requestId) {
        return assignmentRepo.findByMaterialRequestId(requestId).stream().toList();
    }

    public List<DeliveryAssignment> getAssignmentsByDriver(Long driverId) {
        return assignmentRepo.findByDriverId(driverId);
    }

    // ✅ MERGED METHOD: Handles status logic, push notifications, and emails all at once
    public DeliveryAssignment updateStatus(Long assignmentId, String newStatus) {
        DeliveryAssignment assignment = assignmentRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        // 1. Convert incoming String to the required Enum safely
        MaterialRequestStatus parsedStatus = MaterialRequestStatus.valueOf(newStatus.trim().toUpperCase());
        assignment.setStatus(parsedStatus);

        DeliveryAssignment saved = assignmentRepo.save(assignment);

        // 2. EMAIL NOTIFICATION TO THE DRIVER (From your snippet)
        if (saved.getDriver() != null && saved.getDriver().getMail() != null) {
            String driverEmail = saved.getDriver().getMail();
            String emailSubject = "🚚 Delivery Assignment Update";
            String emailBody = "Hello " + saved.getDriver().getName() + ",\n\n" +
                    "Your assigned delivery target status has changed to: " + parsedStatus + ".\n\n" +
                    "Please review your app context queue details.\n\n" +
                    "Best regards,\nIPS Dispatch Team";

            mailService.sendMail(driverEmail, emailSubject, emailBody);
        }

        // 3. PUSH & EMAIL NOTIFICATIONS TO MANAGER IF COMPLETED ("SENT")
        if (MaterialRequestStatus.SENT.equals(saved.getStatus())) {
            MaterialRequest request = assignment.getMaterialRequest();
            Users manager = request.getProject().getProjectManager();

            if (manager != null) {
                String messageText = String.format("Driver %s delivered %d x %s for project '%s'",
                        assignment.getDriver().getName(),
                        assignment.getAssignedQuantity(),
                        request.getMaterial().getName(),
                        request.getProject().getName());

                // Web Push to Manager
                pushNotificationService.sendToUser(
                        manager,
                        "✅ Delivery Completed",
                        messageText,
                        Map.of("type", "delivery_completed", "assignmentId", assignmentId.toString())
                );

                // Email to Manager
                if (manager.getMail() != null && !manager.getMail().isEmpty()) {
                    String managerSubject = "📋 Material Delivery Notification: Completed";
                    String managerBody = String.format("Hello %s,\n\nYour materials have arrived safely at the job site.\n\n" +
                                    "• Project: %s\n" +
                                    "• Item Delivered: %d x %s\n" +
                                    "• Driver: %s\n\n" +
                                    "Best regards,\nIPS System Management",
                            manager.getName(), request.getProject().getName(), assignment.getAssignedQuantity(), request.getMaterial().getName(), assignment.getDriver().getName());

                    mailService.sendMail(manager.getMail(), managerSubject, managerBody);
                }
            }

            // Web Push to Head Driver
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