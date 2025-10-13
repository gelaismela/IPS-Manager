package com.IPS.IPS_Manager.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignRequestDTO {
    private int assignedQuantity;
    private String driverId;
    private LocalDate deliveryDate;
}
