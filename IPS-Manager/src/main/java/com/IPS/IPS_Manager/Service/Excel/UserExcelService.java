package com.IPS.IPS_Manager.Service.Excel;

import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Repository.UserRepo;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserExcelService {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private PasswordEncoder encoder;

    // Valid roles
    private static final Set<String> VALID_ROLES = Set.of(
            "driver", "project_manager", "head_driver", "admin", "dev"
    );

    public Map<String, Object> saveFromExcel(InputStream is) throws IOException {
        Workbook workbook = new XSSFWorkbook(is);
        Sheet sheet = workbook.getSheetAt(0);

        int added = 0;
        int updated = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (Row row : sheet) {
            if (row.getRowNum() == 0) continue; // Skip header

            try {
                // Read cells: Name | Email | Phone | Roles | Password
                String name = getCellValueAsString(row, 0);
                String email = getCellValueAsString(row, 1);
                String phone = getCellValueAsString(row, 2);
                String rolesInput = getCellValueAsString(row, 3); // Can be comma-separated now!
                String password = getCellValueAsString(row, 4);

                // Validation
                if (email == null || email.trim().isEmpty()) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": Email is required");
                    failed++;
                    continue;
                }

                if (name == null || name.trim().isEmpty()) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": Name is required");
                    failed++;
                    continue;
                }

                if (rolesInput == null || rolesInput.trim().isEmpty()) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": Role is required");
                    failed++;
                    continue;
                }

                // ✅ FIXED: Split comma-separated roles from the cell, trim, and lowercase them
                Set<String> processedRoles = Arrays.stream(rolesInput.split(","))
                        .map(String::trim)
                        .map(String::toLowerCase)
                        .filter(role -> !role.isEmpty())
                        .collect(Collectors.toSet());

                // ✅ Validate all parsed roles against the valid list
                List<String> invalidRoles = processedRoles.stream()
                        .filter(role -> !VALID_ROLES.contains(role))
                        .toList();

                if (!invalidRoles.isEmpty()) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": Invalid role(s) " + invalidRoles + ". Valid roles: " + VALID_ROLES);
                    failed++;
                    continue;
                }

                // Check if user exists by email
                Optional<Users> existingUser = userRepo.findByMail(email);

                if (existingUser.isPresent()) {
                    // UPDATE existing user
                    Users user = existingUser.get();
                    user.setName(name);
                    user.setPhone(phone);
                    user.setRoles(processedRoles); // ✅ FIXED: Saving the new Set directly

                    // Only update password if provided in Excel
                    if (password != null && !password.trim().isEmpty()) {
                        user.setPassword(encoder.encode(password));
                    }

                    userRepo.save(user);
                    updated++;
                } else {
                    // ADD new user
                    Users user = new Users();
                    user.setName(name);
                    user.setMail(email);
                    user.setPhone(phone);
                    user.setRoles(processedRoles); // ✅ FIXED: Assigning the Set to the new entity

                    // Set password (default to "changeme123" if not provided)
                    String finalPassword = (password != null && !password.trim().isEmpty())
                            ? password
                            : "changeme123";
                    user.setPassword(encoder.encode(finalPassword));

                    userRepo.save(user);
                    added++;
                }

            } catch (Exception e) {
                errors.add("Row " + (row.getRowNum() + 1) + ": " + e.getMessage());
                failed++;
            }
        }

        workbook.close();

        // Create response
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("added", added);
        response.put("updated", updated);
        response.put("failed", failed);
        response.put("errors", errors);

        return response;
    }

    private String getCellValueAsString(Row row, int cellIndex) {
        try {
            if (row.getCell(cellIndex) == null) {
                return "";
            }

            if (row.getCell(cellIndex).getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                return row.getCell(cellIndex).getStringCellValue().trim();
            } else if (row.getCell(cellIndex).getCellType() == org.apache.poi.ss.usermodel.CellType.NUMERIC) {
                return String.valueOf((long) row.getCell(cellIndex).getNumericCellValue());
            } else {
                return "";
            }
        } catch (Exception e) {
            return "";
        }
    }
}