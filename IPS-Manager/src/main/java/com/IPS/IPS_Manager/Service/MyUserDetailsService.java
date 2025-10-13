package com.IPS.IPS_Manager.Service;


import com.IPS.IPS_Manager.Entity.UserPrincipal;
import com.IPS.IPS_Manager.Entity.Users;
import com.IPS.IPS_Manager.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;


@Service
    public class MyUserDetailsService implements UserDetailsService {
        @Autowired
        private UserRepo repo;

        @Override
        public UserDetails loadUserByUsername(String mail) throws UsernameNotFoundException {
            System.out.println("Looking for user: " + mail);
            Optional<Users> user = repo.findByMail(mail);
            if(user.isEmpty()) {
                System.out.println("User not found: " + mail);
                throw new UsernameNotFoundException("User not found with email: " + mail);
            }

            System.out.println("Found user: " + user.get().getMail());
            return new UserPrincipal(user.orElse(null));
        }

    }

