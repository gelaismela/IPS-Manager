package com.IPS.IPS_Manager.Repository;

import com.IPS.IPS_Manager.Entity.ProjectMaterial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectMaterialRepo extends JpaRepository<ProjectMaterial, Long> {
    List<ProjectMaterial> findByProject_Id(Long projectId);

    Optional<ProjectMaterial> findByProject_IdAndMaterial_Id(Long projectId, String materialId);

    // convenience alias if you want the old naming too:
    default Optional<ProjectMaterial> findByProjectIdAndMaterialId(Long projectId, String materialId) {
        return findByProject_IdAndMaterial_Id(projectId, materialId);
    }
}
