package com.IPS.IPS_Manager.Service;

import com.IPS.IPS_Manager.Entity.FailedRequest;
import com.IPS.IPS_Manager.Repository.FailedRequestRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FailedRequestService {

    @Autowired
    private  FailedRequestRepo failedRequestRepo;

    public FailedRequestService(FailedRequestRepo failedRequestRepo) {
        this.failedRequestRepo = failedRequestRepo;
    }

    public FailedRequest create(FailedRequest request) {
        return failedRequestRepo.save(request);
    }

    public List<FailedRequest> getAll() {
        return failedRequestRepo.findAllByOrderByCreatedAtDesc();
    }
}