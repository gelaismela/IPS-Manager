package com.IPS.IPS_Manager.Controller;

import com.IPS.IPS_Manager.Entity.FailedRequest;
import com.IPS.IPS_Manager.Service.FailedRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/failed-requests")
public class FailedRequestController {

    private final FailedRequestService failedRequestService;

    public FailedRequestController(FailedRequestService failedRequestService) {
        this.failedRequestService = failedRequestService;
    }

    @PostMapping("/create")
    public ResponseEntity<FailedRequest> create(@RequestBody FailedRequest request) {
        return ResponseEntity.ok(failedRequestService.create(request));
    }

    @GetMapping("/all")
    public List<FailedRequest> getAll() {
        return failedRequestService.getAll();
    }
}
