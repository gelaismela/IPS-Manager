package com.IPS.IPS_Manager.Repository;

import com.IPS.IPS_Manager.Entity.DeliveryPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeliveryPhotoRepo extends JpaRepository<DeliveryPhoto, Long> {

    /**
     * Finds all photos associated with a specific delivery assignment.
     * This is useful for rendering an image gallery on the frontend.
     */
    List<DeliveryPhoto> findByDeliveryAssignmentId(Long assignmentId);

    /**
     * PERFORMANCE OPTIMIZATION TIP (Optional):
     * Because BLOB data arrays can be massive, fetching a list of photos using the method above
     * will download ALL the heavy image bytes into server memory at once.
     * * Use this custom projection query instead when you ONLY want a list of IDs and file names
     * to build image preview links on your frontend dashboard without clogging memory!
     */
    @Query("SELECT p.id, p.fileName, p.fileType FROM DeliveryPhoto p WHERE p.deliveryAssignment.id = :assignmentId")
    List<Object[]> findPhotoSummaryByAssignmentId(@Param("assignmentId") Long assignmentId);
}