package com.IPS.IPS_Manager.Repository;

import com.IPS.IPS_Manager.Entity.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryAssignmentRepo extends JpaRepository<DeliveryAssignment, Long> {
    List<DeliveryAssignment> findByMaterialRequestId(Long requestId);
    List<DeliveryAssignment> findByDriverId(Long driverId);
}