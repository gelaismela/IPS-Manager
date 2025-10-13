package com.IPS.IPS_Manager.Service;

import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.neo4j.Neo4jProperties;
import org.springframework.boot.autoconfigure.pulsar.PulsarProperties;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    @Autowired
    private UserRepo repo;

    @Autowired
    private AuthenticationManager authManager;

    @Autowired
    private JWTService service;

    private BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public Users register(Users user){
        user.setPassword(encoder.encode(user.getPassword()));
        return repo.save(user);
    }

    public Users update(Long id, Users userDetails) {
        return repo.findById(id).map(user -> {

            if (userDetails.getMail() != null && !userDetails.getMail().isEmpty()) {
                user.setMail(userDetails.getMail());
            }

            if (userDetails.getName() != null && !userDetails.getName().isEmpty()) {
                user.setName(userDetails.getName());
            }

            if (userDetails.getRole() != null && !userDetails.getRole().isEmpty()) {
                user.setRole(userDetails.getRole());
            }

            if (userDetails.getPhone() != null && !userDetails.getPhone().isEmpty()) {
                user.setPhone(userDetails.getPhone());
            }

            if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
                user.setPassword(encoder.encode(userDetails.getPassword()));
            }

            return repo.save(user);
        }).orElseThrow(() -> new RuntimeException("User not found with id " + id));
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new RuntimeException("User not found with id " + id);
        }
        repo.deleteById(id);
    }

    public String verify(Users user) {
        Authentication authentication = authManager.authenticate(new UsernamePasswordAuthenticationToken(user.getMail(), user.getPassword()));

        if (authentication.isAuthenticated()){
            return service.generateToken(user.getMail());
        }
        else return "fail";
    }

    public List<Users> getAllUsers() {
        return repo.findAll();
    }


    public Optional<Users> getUserById(Long id) {
        return repo.findById(id);
    }

    public List<Users> getAllDrivers() {
        return repo.findAll()
                .stream()
                .filter(users -> "driver".equalsIgnoreCase(users.getRole()))
                .toList();
    }

}
