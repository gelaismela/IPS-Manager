package com.IPS.IPS_Manager.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Data
public class Material {

    @Id
    @Column(unique = true)
    private String Id;
    private String Name;
    private String unit;
    private int quantity;
}
