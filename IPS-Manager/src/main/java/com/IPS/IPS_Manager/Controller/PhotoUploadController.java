package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.Entity.DeliveryAssignment;
import com.IPS.IPS_Manager.Entity.DeliveryPhoto;
import com.IPS.IPS_Manager.Repository.DeliveryAssignmentRepo;
import com.IPS.IPS_Manager.Repository.DeliveryPhotoRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/photos")
@RequiredArgsConstructor
@Slf4j
public class PhotoUploadController {

    private final DeliveryPhotoRepo photoRepo;
    private final DeliveryAssignmentRepo assignmentRepo;

    /**
     * Upload photo directly into PostgreSQL as a BLOB byte array
     */
    @PostMapping("/upload/delivery/{assignmentId}")
    public ResponseEntity<?> uploadDeliveryPhoto(
            @PathVariable Long assignmentId,
            @RequestParam("file") MultipartFile file) {

        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Please select a file to upload"));
            }

            DeliveryAssignment assignment = assignmentRepo.findById(assignmentId)
                    .orElseThrow(() -> new RuntimeException("Delivery Assignment not found: " + assignmentId));

            // Convert the uploaded multipart file directly into a raw byte array
            DeliveryPhoto deliveryPhoto = DeliveryPhoto.builder()
                    .fileName(file.getOriginalFilename())
                    .fileType(file.getContentType())
                    .data(file.getBytes()) // Direct database storage conversion
                    .deliveryAssignment(assignment)
                    .build();

            photoRepo.save(deliveryPhoto);
            log.info("📸 Photo saved directly into database for assignment ID: {}", assignmentId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Photo uploaded and saved to DB successfully!",
                    "photoId", deliveryPhoto.getId()
            ));

        } catch (IOException e) {
            log.error("❌ Failed to process upload file bytes", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload processing failed: " + e.getMessage()));
        }
    }

    /**
     * Serve the photo from PostgreSQL back to the browser
     */
    @GetMapping("/view/{photoId}")
    public ResponseEntity<byte[]> viewPhoto(@PathVariable Long photoId) {
        DeliveryPhoto photo = photoRepo.findById(photoId)
                .orElseThrow(() -> new RuntimeException("Photo record not found with ID: " + photoId));

        String contentType = photo.getFileType() != null ? photo.getFileType() : "image/jpeg";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + photo.getFileName() + "\"")
                .body(photo.getData());
    }

    @GetMapping("/deliveries/{assignmentId}/photos")
    public ResponseEntity<List<Map<String, Object>>> getDeliveryPhotosMetadata(@PathVariable Long assignmentId) {
        // 🔗 Fetch photos attached to this specific delivery assignment id
        List<DeliveryPhoto> photos = photoRepo.findByDeliveryAssignmentId(assignmentId);

        // Map them into a clean array of lightweight objects: [{id, fileName, fileType}]
        List<Map<String, Object>> metadataList = photos.stream().map(photo -> {
            Map<String, Object> meta = new java.util.HashMap<>();
            meta.put("id", photo.getId());
            meta.put("fileName", photo.getFileName());
            meta.put("fileType", photo.getFileType());
            return meta;
        }).toList();

        return ResponseEntity.ok(metadataList);
    }
}