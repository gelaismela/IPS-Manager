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
                // Read cells: Name | Email | Phone | Role | Password
                String name = getCellValueAsString(row, 0);
                String email = getCellValueAsString(row, 1);
                String phone = getCellValueAsString(row, 2);
                String role = getCellValueAsString(row, 3).toLowerCase();
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

                if (role == null || role.trim().isEmpty()) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": Role is required");
                    failed++;
                    continue;
                }

                if (!VALID_ROLES.contains(role)) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": Invalid role '" + role + "'. Valid roles: " + VALID_ROLES);
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
                    user.setRole(role);

                    // Only update password if provided in Excel
                    if (password != null && !password.trim().isEmpty()) {
                        user.setPassword(encoder.encode(password));
                    }
                    // Otherwise keep existing password

                    userRepo.save(user);
                    updated++;
                } else {
                    // ADD new user
                    Users user = new Users();
                    user.setName(name);
                    user.setMail(email);
                    user.setPhone(phone);
                    user.setRole(role);

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

            // Use if-else instead of switch for Java 11+ compatibility
            if (row.getCell(cellIndex).getCellType() == org.apache.poi.ss.usermodel.CellType.STRING) {
                return row.getCell(cellIndex).getStringCellValue().trim();
            } else if (row.getCell(cellIndex).getCellType() == org.apache.poi.ss.usermodel.CellType.NUMERIC) {
                // Handle phone numbers stored as numbers
                return String.valueOf((long) row.getCell(cellIndex).getNumericCellValue());
            } else {
                return "";
            }
        } catch (Exception e) {
            return "";
        }
    }
}
