package com.IPS.IPS_Manager.Repository;

import com.IPS.IPS_Manager.Entity.PushSubscription;
import com.IPS.IPS_Manager.Entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    
    /**
     * Find all active subscriptions for a specific user
     */
    List<PushSubscription> findByUserAndActiveTrue(Users user);
    
    /**
     * Find all active subscriptions for users with a specific role
     */
    List<PushSubscription> findByUser_RoleAndActiveTrue(String role);
    
    /**
     * Find subscription by endpoint
     */
    Optional<PushSubscription> findByEndpoint(String endpoint);
    
    /**
     * Count active subscriptions for a user
     */
    long countByUserAndActiveTrue(Users user);
}
