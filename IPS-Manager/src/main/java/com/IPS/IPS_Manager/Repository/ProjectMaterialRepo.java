package com.IPS.IPS_Manager.Repository;

import com.IPS.IPS_Manager.Entity.ProjectMaterial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectMaterialRepo extends JpaRepository<ProjectMaterial, Long> {
    List<ProjectMaterial> findByProject_Id(Long projectId);

    Optional<ProjectMaterial> findByProjectIdAndMaterialId(Long projectId, String materialId);

    List<ProjectMaterial> findByProjectId(Long projectId);
}
