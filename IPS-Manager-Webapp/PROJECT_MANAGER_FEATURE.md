# Project Manager Assignment Feature

## Overview

This feature allows admins to assign project managers to projects. Project managers will only see their assigned projects in the project list.

---

## Backend Implementation Required

### 1. Update `Project` Entity

Add a field to link project to a project manager:

```java
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String projectCode;

    // NEW FIELD - Link to project manager
    @ManyToOne
    @JoinColumn(name = "project_manager_id")
    private Users projectManager;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL)
    private List<ProjectMaterial> materials;

    // ... other fields
}
```

**Database Migration Needed:**

```sql
ALTER TABLE project ADD COLUMN project_manager_id BIGINT;
ALTER TABLE project ADD CONSTRAINT fk_project_manager
    FOREIGN KEY (project_manager_id) REFERENCES users(id);
```

---

### 2. Update `ProjectRepo` Interface

Add methods to query projects by manager:

```java
public interface ProjectRepo extends JpaRepository<Project, Long> {
    // ... existing methods

    // Find all projects managed by a specific user ID
    List<Project> findByProjectManagerId(Long projectManagerId);

    // Find all projects managed by a specific user email
    List<Project> findByProjectManagerMail(String email);
}
```

---

### 3. Create DTO

Create `AssignProjectManagerDTO.java`:

```java
package com.IPS.IPS_Manager.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignProjectManagerDTO {
    private Long projectManagerId;
}
```

---

### 4. Update `ProjectController`

Add endpoints for assigning managers and filtering projects:

```java
@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    @Autowired
    private ProjectService projectService;
    @Autowired
    private UserRepo userRepo;

    // ... existing endpoints

    // Admin: Assign project manager to a project
    @PutMapping("/{projectId}/assign-manager")
    @PreAuthorize("hasRole('dev')")
    public ResponseEntity<?> assignProjectManager(
            @PathVariable Long projectId,
            @RequestBody AssignProjectManagerDTO dto) {
        try {
            Project project = projectService.assignProjectManager(
                projectId,
                dto.getProjectManagerId()
            );
            return ResponseEntity.ok(project);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body("Error assigning project manager: " + e.getMessage());
        }
    }

    // Project Manager: Get only their assigned projects
    @GetMapping("/my-projects")
    @PreAuthorize("hasRole('project_manager')")
    public ResponseEntity<?> getMyProjects(Principal principal) {
        try {
            String email = principal.getName();
            List<Project> projects = projectService.getProjectsByManagerEmail(email);
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body("Error fetching projects: " + e.getMessage());
        }
    }

    // Admin: Get all projects (with manager info)
    @GetMapping("/all")
    @PreAuthorize("hasRole('dev')")
    public ResponseEntity<?> getAllProjects() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }
}
```

---

### 5. Update `ProjectService`

Add business logic for project manager assignment:

```java
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepo projectRepo;
    private final UserRepo userRepo;
    private final MaterialRepo materialRepo;
    private final ProjectMaterialRepo projectMaterialRepo;

    // ... existing methods

    /**
     * Assign a project manager to a project
     */
    @Transactional
    public Project assignProjectManager(Long projectId, Long projectManagerId) {
        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        Users projectManager = userRepo.findById(projectManagerId)
            .orElseThrow(() -> new RuntimeException("User not found: " + projectManagerId));

        // Optional: Validate that user has project_manager role
        if (!"project_manager".equals(projectManager.getRole()) &&
            !"dev".equals(projectManager.getRole())) {
            throw new RuntimeException(
                "User must have project_manager or dev role to be assigned as project manager"
            );
        }

        project.setProjectManager(projectManager);
        return projectRepo.save(project);
    }

    /**
     * Get all projects assigned to a specific project manager by email
     */
    public List<Project> getProjectsByManagerEmail(String email) {
        return projectRepo.findByProjectManagerMail(email);
    }

    /**
     * Get all projects (used by admin)
     */
    public List<Project> getAllProjects() {
        return projectRepo.findAll();
    }
}
```

---

## Frontend Implementation (Already Done ✅)

### API Calls Added

- `assignProjectManager(projectId, projectManagerId)` - Assign manager to project
- `getMyProjects()` - Get projects for logged-in project manager

### UI Features Added

1. **Project Card Updates:**

   - Shows current project manager name
   - Shows "Not Assigned" in red if no manager
   - "Assign Manager" button (green) next to "Edit Materials"

2. **Assign Manager Modal:**
   - Displays project name
   - Shows current manager
   - Dropdown to select new manager
   - Auto-saves on selection
   - Filters users by `project_manager` or `dev` role

---

## Testing Steps

### 1. Test Admin Assigning Manager

1. Login as admin (dev role)
2. Go to Admin Dashboard
3. Click "Assign Manager" on any project
4. Select a project manager from dropdown
5. **Expected:** Success message, manager name appears on card

### 2. Test Project Manager View

1. Create endpoint in frontend to call `getMyProjects()`
2. Login as project manager
3. Navigate to projects page
4. **Expected:** Only see projects assigned to that manager

### 3. Test Validation

1. Try to assign a user without `project_manager` role
2. **Expected:** Error message

### 4. Test Database

```sql
-- Check project_manager assignments
SELECT p.id, p.name, p.project_code, u.name as manager_name, u.mail
FROM project p
LEFT JOIN users u ON p.project_manager_id = u.id;

-- Find projects without managers
SELECT * FROM project WHERE project_manager_id IS NULL;
```

---

## Next Steps

### For Project Manager Role

You may want to create a separate page/component for project managers:

```javascript
// ProjectManagerPage.js
import { useEffect, useState } from "react";
import { getMyProjects } from "../api/api";

const ProjectManagerPage = () => {
  const [myProjects, setMyProjects] = useState([]);

  useEffect(() => {
    const fetchMyProjects = async () => {
      try {
        const projects = await getMyProjects();
        setMyProjects(projects);
      } catch (err) {
        console.error("Error fetching my projects:", err);
      }
    };
    fetchMyProjects();
  }, []);

  return (
    <div>
      <h1>My Projects</h1>
      {/* Display only assigned projects */}
    </div>
  );
};
```

### Security Enhancements

- Project managers should only access data from their projects
- Add validation in backend for all project-related endpoints
- Check `projectManager.id` matches logged-in user for project managers

---

## Benefits

✅ **Role-Based Access Control:** Project managers only see their projects
✅ **Easy Assignment:** Admin can quickly assign/reassign managers
✅ **Audit Trail:** Track who manages which project
✅ **Scalability:** Supports multiple project managers
✅ **Flexibility:** Admins (dev role) can still see all projects
