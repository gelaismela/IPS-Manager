package com.IPS.IPS_Manager.Enum;

public enum MaterialRequestStatus {
    PENDING,             // request created by worker
    PARTIALLY_ASSIGNED,  // head assigned part of request
    ASSIGNED,            // fully assigned
    SENT                 // delivered
}

