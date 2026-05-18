package com.IPS.IPS_Manager.Service;


import com.IPS.IPS_Manager.Entity.DeliveryAssignment;
import com.IPS.IPS_Manager.Entity.Project;
import com.IPS.IPS_Manager.Enum.MaterialRequestStatus;
import com.IPS.IPS_Manager.Repository.DeliveryAssignmentRepo;
import com.IPS.IPS_Manager.Repository.ProjectRepo;
import org.checkerframework.checker.units.qual.A;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    @Autowired
    private JavaMailSender mailSender;


    @Autowired
    private DeliveryAssignmentRepo assignmentRepo;


    public void sendLoginNotification(String toEmail, String username) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Login Notification");
        message.setText("Hello " + username + ",\n\nYou have just logged into your account.");
        message.setFrom("mate.mamaladze@gmail.com");

        mailSender.send(message);
    }

    public void sendMail(String toEmail, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);
        message.setFrom("mate.mamaladze@gmail.com");

        mailSender.send(message);
    }
}
