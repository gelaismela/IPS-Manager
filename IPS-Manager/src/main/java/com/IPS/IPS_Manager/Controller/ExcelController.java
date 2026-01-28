package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.Service.Excel.MaterialExcelService;
import com.IPS.IPS_Manager.Service.Excel.ProjectMaterialExcelService;
import com.IPS.IPS_Manager.Service.Excel.UserExcelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;


@RestController
@RequestMapping("/api/excel")
@PreAuthorize("hasRole('dev')")
public class ExcelController {

    @Autowired
    private MaterialExcelService materialExcelService;
    @Autowired
    private ProjectMaterialExcelService projectMaterialExcelService;
    @Autowired
    private UserExcelService userExcelService;

    @PostMapping("/upload-materials")
    public ResponseEntity<?> uploadMaterials(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || !isValidExcelFile(file)) {
            return ResponseEntity.badRequest().body(createErrorResponse("Invalid file type. Please upload .xlsx or .xls"));
        }

        try {
            Map<String, Object> result = materialExcelService.saveFromExcel(file.getInputStream());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(createErrorResponse("Error processing file: " + e.getMessage()));
        }
    }

    @PostMapping("/upload-project-materials")
    public ResponseEntity<?> uploadProjectMaterials(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectId") Long projectId) {

        if (file.isEmpty() || !isValidExcelFile(file)) {
            return ResponseEntity.badRequest().body(createErrorResponse("Invalid file type"));
        }

        try {
            Map<String, Object> result = projectMaterialExcelService.saveProjectMaterialsFromExcel(file.getInputStream(), projectId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(createErrorResponse("Error: " + e.getMessage()));
        }
    }

    @PostMapping("/upload-users")
    public ResponseEntity<?> uploadUsers(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || !isValidExcelFile(file)) {
            return ResponseEntity.badRequest().body(createErrorResponse("Invalid file type"));
        }

        try {
            Map<String, Object> result = userExcelService.saveFromExcel(file.getInputStream());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(createErrorResponse("Error: " + e.getMessage()));
        }
    }

    private boolean isValidExcelFile(MultipartFile file) {
        String filename = file.getOriginalFilename();
        return filename != null && (filename.endsWith(".xlsx") || filename.endsWith(".xls") || filename.endsWith(".csv"));
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
}