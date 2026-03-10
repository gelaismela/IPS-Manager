package com.IPS.IPS_Manager.Repository;

import com.IPS.IPS_Manager.Entity.FailedRequest;
import com.IPS.IPS_Manager.Enum.FailedRequestType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FailedRequestRepo extends JpaRepository<FailedRequest, Long> {
    List<FailedRequest> findAllByOrderByCreatedAtDesc();
    List<FailedRequest> findByType(FailedRequestType type);
}