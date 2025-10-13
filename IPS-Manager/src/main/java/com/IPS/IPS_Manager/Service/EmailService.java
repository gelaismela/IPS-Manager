package com.IPS.IPS_Manager.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    @Autowired
    private JavaMailSender mailSender;

    public void sendLoginNotification(String toEmail, String username) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Login Notification");
        message.setText("Hello " + username + ",\n\nYou have just logged into your account.");
        message.setFrom("yourgmail@gmail.com");  // same as your configured username

        mailSender.send(message);
    }
}
