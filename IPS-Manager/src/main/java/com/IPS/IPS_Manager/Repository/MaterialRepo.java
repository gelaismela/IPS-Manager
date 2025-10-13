package com.IPS.IPS_Manager.Repository;

import com.IPS.IPS_Manager.Entity.Material;
import com.IPS.IPS_Manager.Entity.Project;
import com.IPS.IPS_Manager.Entity.ProjectMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MaterialRepo extends JpaRepository<Material, String> {


}
