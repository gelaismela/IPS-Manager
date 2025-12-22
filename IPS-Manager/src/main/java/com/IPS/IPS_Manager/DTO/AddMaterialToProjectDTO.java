package com.IPS.IPS_Manager.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddMaterialToProjectDTO {
    private String materialId;
    private Integer quantity;
}