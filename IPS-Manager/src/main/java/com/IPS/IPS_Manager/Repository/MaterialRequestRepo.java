package com.IPS.IPS_Manager.Repository;

import com.IPS.IPS_Manager.Entity.MaterialRequest;
import com.IPS.IPS_Manager.Enum.MaterialRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MaterialRequestRepo extends JpaRepository<MaterialRequest, Long> {

    List<MaterialRequest> findByProjectIdAndStatus(Long projectId, MaterialRequestStatus status);
    List<MaterialRequest> findByStatus(MaterialRequestStatus status);

    List<MaterialRequest> findByProject_Id(Long projectId);

}
