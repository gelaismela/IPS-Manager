package com.IPS.IPS_Manager.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "delivery_photos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;
    private String fileType;


    @Column(name = "data", columnDefinition = "BYTEA") // Maps directly to Postgres bytea type
    private byte[] data;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_assignment_id")
    private DeliveryAssignment deliveryAssignment;
}