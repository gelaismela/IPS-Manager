package com.IPS.IPS_Manager.Entity;

import com.IPS.IPS_Manager.Enum.MaterialRequestStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private MaterialRequest materialRequest;

    @ManyToOne(optional = false)
    private Users driver;

    private int assignedQuantity;

    private LocalDate deliveryDate;

    @Enumerated(EnumType.STRING)
    private MaterialRequestStatus status = MaterialRequestStatus.PENDING;
}