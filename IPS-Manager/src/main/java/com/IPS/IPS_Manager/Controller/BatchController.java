package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.Entity.DeliveryAssignment;
import com.IPS.IPS_Manager.Entity.DeliveryPhoto;
import com.IPS.IPS_Manager.Entity.MaterialRequest;
import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Enum.MaterialRequestStatus;
import com.IPS.IPS_Manager.Repository.DeliveryAssignmentRepo;
import com.IPS.IPS_Manager.Repository.DeliveryPhotoRepo;
import com.IPS.IPS_Manager.Repository.MaterialRequestRepo;
import com.IPS.IPS_Manager.Repository.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/batches")
@RequiredArgsConstructor
public class BatchController {

    @Autowired
    private DeliveryAssignmentRepo assignmentRepo;
    @Autowired private MaterialRequestRepo requestRepo;
    @Autowired private UserRepo userRepo;
    @Autowired private DeliveryPhotoRepo photoRepo;

    @SuppressWarnings("unchecked")
    @PostMapping
    public ResponseEntity<?> createBatch(@RequestBody Map<String, Object> payload) {
        String batchId = UUID.randomUUID().toString();

        List<Map<String, Object>> materials = (List<Map<String, Object>>) payload.get("materials");
        String projectName = null;

        for (Map<String, Object> mat : materials) {
            List<Integer> rawIds = (List<Integer>) mat.get("requestIds");
            if (rawIds == null || rawIds.isEmpty()) continue;

            Long requestId = Long.valueOf(rawIds.get(0));
            MaterialRequest request = requestRepo.findById(requestId)
                    .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

            if (projectName == null) projectName = request.getProject().getName();

            DeliveryAssignment assignment = new DeliveryAssignment();
            assignment.setMaterialRequest(request);
            assignment.setDriver(null);
            assignment.setAssignedQuantity(Integer.parseInt(mat.get("quantity").toString()));
            assignment.setDeliveryDate(null);
            assignment.setStatus(MaterialRequestStatus.PENDING);
            assignment.setBatchId(batchId);

            assignmentRepo.save(assignment);
        }

        return ResponseEntity.ok(Map.of(
                "id", batchId,
                "projectName", projectName != null ? projectName : "",
                "status", "PENDING",
                "createdAt", LocalDateTime.now().toString(),
                "materials", materials.stream().map(m -> Map.of(
                        "materialName", m.getOrDefault("materialName", ""),
                        "unit", m.getOrDefault("unit", ""),
                        "quantity", m.get("quantity")
                )).collect(Collectors.toList())
        ));
    }

    @GetMapping
    public ResponseEntity<?> getAllBatches() {
        Map<String, List<DeliveryAssignment>> grouped = assignmentRepo.findByBatchIdIsNotNull()
                .stream()
                .collect(Collectors.groupingBy(DeliveryAssignment::getBatchId));

        List<Map<String, Object>> result = grouped.entrySet().stream().map(entry -> {
            List<DeliveryAssignment> list = entry.getValue();
            DeliveryAssignment first = list.get(0);
            boolean assigned = first.getDriver() != null;

            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", entry.getKey());
            dto.put("projectId", first.getMaterialRequest().getProject().getId());
            dto.put("projectName", first.getMaterialRequest().getProject().getName());
            dto.put("status", assigned ? "ASSIGNED" : "PENDING");
            dto.put("createdAt", null);
            dto.put("deliveryDate", first.getDeliveryDate());
            dto.put("driver", assigned
                    ? Map.of("id", first.getDriver().getId(), "name", first.getDriver().getName())
                    : null);
            dto.put("materials", list.stream().map(a -> Map.of(
                    "materialName", a.getMaterialRequest().getMaterial().getName(),
                    "unit",         a.getMaterialRequest().getMaterial().getUnit(),
                    "quantity",     a.getAssignedQuantity()
            )).collect(Collectors.toList()));
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PutMapping("/{batchId}/assign")
    public ResponseEntity<?> assignBatch(
            @PathVariable String batchId,
            @RequestBody Map<String, Object> payload) {

        Long driverId = Long.valueOf(payload.get("driverId").toString());
        String dateStr = payload.get("deliveryDate") != null
                ? payload.get("deliveryDate").toString() : null;
        LocalDate date = dateStr != null ? LocalDate.parse(dateStr) : null;

        Users driver = userRepo.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        List<DeliveryAssignment> assignments = assignmentRepo.findByBatchId(batchId);
        if (assignments.isEmpty()) return ResponseEntity.notFound().build();

        for (DeliveryAssignment a : assignments) {
            a.setDriver(driver);
            a.setDeliveryDate(date);
            a.setBatchId(null); // ← clear grouping, batch disappears from queue
            assignmentRepo.save(a);
        }

        return ResponseEntity.ok(Map.of("batchId", batchId, "status", "ASSIGNED"));
    }
    @DeleteMapping("/{batchId}")
    public ResponseEntity<Void> deleteBatch(@PathVariable String batchId) {
        List<DeliveryAssignment> assignments = assignmentRepo.findByBatchId(batchId);
        for (DeliveryAssignment a : assignments) {
            List<DeliveryPhoto> photos = photoRepo.findByDeliveryAssignmentId(a.getId());
            if (!photos.isEmpty()) photoRepo.deleteAll(photos);
            assignmentRepo.delete(a);
        }
        return ResponseEntity.noContent().build();
    }
}