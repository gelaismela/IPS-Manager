package com.IPS.IPS_Manager.DTO;

import com.IPS.IPS_Manager.Enum.MaterialRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialRequestDTO {
    private Long id;
    private Long projectId;
    private String projectName;
    private String materialId;
    private String materialName;
    private int requestedQuantity;
    private int assignedQuantity;
    private String driverName;
    private LocalDate deliveryDate;
    private MaterialRequestStatus status;
}
