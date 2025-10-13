package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.Service.Excel.MaterialExcelService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Objects;

@RestController
@RequestMapping("/api/excel")
@PreAuthorize("hasRole('dev')")

public class ExcelController {

    private final MaterialExcelService excelService;

    public ExcelController(MaterialExcelService excelService) {
        this.excelService = excelService;
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadExcel(@RequestParam("file") MultipartFile file) {
        if (!Objects.requireNonNull(file.getOriginalFilename()).endsWith(".xlsx")) {
            return ResponseEntity.badRequest().body("Invalid file type");
        }

        try {
            excelService.saveFromExcel(file.getInputStream());
            return ResponseEntity.ok("File uploaded and data saved");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error processing file: " + e.getMessage());
        }
    }
}
