package com.IPS.IPS_Manager.Controller;


import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Repository.UserRepo;
import com.IPS.IPS_Manager.Service.EmailService;
import com.IPS.IPS_Manager.Service.MailService;
import com.IPS.IPS_Manager.Service.PasswordResetService;
import com.IPS.IPS_Manager.Service.UserService;
import org.apache.xmlbeans.impl.xb.xsdschema.Public;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;


@RestController
@RequestMapping("/auth")
public class UserController {

    @Autowired
    private UserService service;

    @Autowired
    private UserRepo repo;

    @Autowired
    private MailService mailService;

    @Autowired
    private PasswordResetService passwordResetService;

    @PostMapping("/register")
    public Users addUser(@RequestBody Users user) {
        return service.register(user);
    }

    @PostMapping("/registerAll")
    public List<Users> addUsers(@RequestBody List<Users> users) {
        return users.stream().map(service::register).toList();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Users user) {
        String jwtToken = service.verify(user);
        if (jwtToken != null && !jwtToken.equals("fail")) {
            Users dbUser = repo.findByMail(user.getMail())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(Map.of(
                    "token", jwtToken,
                    "role", dbUser.getRole()
            ));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }
    }

    @GetMapping("/users")
    public List<Users> getAllUsers() {
        return service.getAllUsers();
    }
    
    
    @GetMapping("/users/{id}")
    public Optional<Users> getUserById(@PathVariable Long id){
        return service.getUserById(id);
    }



    @PutMapping("/user/{id}")
    public ResponseEntity<Users> updateUser(@PathVariable Long id, @RequestBody Users userDetails) {
        try {
            Users updatedUser = service.update(id, userDetails);
            return ResponseEntity.ok(updatedUser);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        try {
            service.delete(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/drivers/all")
    public ResponseEntity<List<Users>> getAllDrivers() {
        return ResponseEntity.ok(service.getAllDrivers());
    }


    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("mail");
        passwordResetService.sendResetLink(email);
        return ResponseEntity.ok("If the email exists, a reset link has been sent.");
    }


    // ✅ Reset password
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        String newPassword = payload.get("newPassword");
        passwordResetService.resetPassword(token, newPassword);
        return ResponseEntity.ok("Password reset successful.");
    }

}
