package com.IPS.IPS_Manager.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRequestDTO {
    private Long projectId;
    private String materialId;
    private int requestedQuantity;
}
