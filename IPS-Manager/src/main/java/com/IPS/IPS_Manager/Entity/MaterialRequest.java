package com.IPS.IPS_Manager.Entity;

import com.IPS.IPS_Manager.Enum.MaterialRequestStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.userdetails.User;

import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Project project;

    @ManyToOne(optional = false)
    private Material material;

    private int requestedQuantity;

    private int assignedQuantity;

    @ManyToOne
    private Users driver;

    private LocalDate requestDate = LocalDate.now();
    private LocalDate deliveryDate;

    @Enumerated(EnumType.STRING)
    private MaterialRequestStatus status = MaterialRequestStatus.PENDING;
}

