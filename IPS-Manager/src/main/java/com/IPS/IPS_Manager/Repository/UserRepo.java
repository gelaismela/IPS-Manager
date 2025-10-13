package com.IPS.IPS_Manager.Repository;

import com.IPS.IPS_Manager.Entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Repository;



import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepo extends JpaRepository<Users, Long> {
   Optional<Users> findByMail(String mail);

    Users findByName(String name);

    List<Users> findByRole(String role);


}
