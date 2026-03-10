package com.IPS.IPS_Manager.Entity;

import com.IPS.IPS_Manager.Enum.FailedRequestType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Data
@Table(name = "failed_requests")
public class FailedRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FailedRequestType type; // STOCK_SHORTAGE or QUOTA_EXCEEDED

    @Column(nullable = false)
    private String materialId;

    @Column(nullable = false)
    private int requestedQuantity;

    private int availableQuantity; // how much was actually in stock at time of failure

    private Long driverId;    // set for STOCK_SHORTAGE, null for QUOTA_EXCEEDED
    private Long projectId;   // set for QUOTA_EXCEEDED, null for STOCK_SHORTAGE

    private LocalDate deliveryDate; // nullable

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // getters + setters
}