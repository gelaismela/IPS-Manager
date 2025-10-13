package com.IPS.IPS_Manager.Service;

import com.IPS.IPS_Manager.Entity.Project;
import com.IPS.IPS_Manager.Repository.ProjectRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProjectService {
    @Autowired
    private ProjectRepo repo;

    public Project addProject(Project project) {
        return repo.save(project);
    }

    public List<Project> getAllProjects() {
        return repo.findAll();
    }
}
