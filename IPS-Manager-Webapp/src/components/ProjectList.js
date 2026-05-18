import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyProjects } from "../api/api";
import "../styles/projectList.css";

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getMyProjects();
        setProjects(data);
        setIsPending(false);
      } catch (err) {
        setError(err.message);
        setIsPending(false);
      }
    };

    fetchProjects();
  }, []);

  // Filter and limit projects
  const filteredProjects = projects
    .filter(
      (project) =>
        project.name?.toLowerCase().includes(search.toLowerCase()) ||
        String(project.project_code || project.projectCode)
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .slice(0, 6); // Show only first 6

  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  if (isPending) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="projectList-main">
      <h2>All Projects</h2>
      <div className="projectList-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or Project Code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {filteredProjects.length > 0 ? (
        <ul className="projectList">
          {filteredProjects.map((project) => (
            <li
              key={project.id}
              className="projectItem"
              onClick={() => handleProjectClick(project.id)}
            >
              {project.name}{" "}
              <span style={{ color: "#888" }}>
                ({project.project_code || project.projectCode})
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="noProjects">No projects found.</div>
      )}
    </div>
  );
};

export default ProjectList;
