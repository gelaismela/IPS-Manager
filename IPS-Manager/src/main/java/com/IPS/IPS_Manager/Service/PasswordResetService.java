package com.IPS.IPS_Manager.Service;

import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetService {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private MailService mailService;

    @Autowired
    private JWTService jwtService;

    private BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    // Step 1: Send reset link
    public void sendResetLink(String mail) {
        Users user = userRepo.findByMail(mail)
                .orElseThrow(() -> new RuntimeException("No user with email " + mail));

        String token = jwtService.generateResetToken(user.getMail());
        String resetLink = "http://localhost:3000/reset-password?token=" + token;
        String resetLinkNew = "http://192.168.100.25:3000/reset-password?token=" + token;

        mailService.sendMail(user.getMail(),
                "Password Reset Request",
                "Click the following link to reset your password (valid 15 minutes):\n\n" + resetLink);
    }

    // Step 2: Reset password using token
    public void resetPassword(String token, String newPassword) {
        String mail = jwtService.validateResetToken(token);

        Users user = userRepo.findByMail(mail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(encoder.encode(newPassword));
        userRepo.save(user);
    }
}
