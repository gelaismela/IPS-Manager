import React, { useState, useRef, useEffect } from "react";
import { API_BASE, getProjects } from "../api/api";
import "../styles/excelUpload.css";
import { useToast } from "../contexts/ToastContext";

const ExcelUpload = () => {
  const [uploadType, setUploadType] = useState("materials");
  const [selectedProject, setSelectedProject] = useState("");
  const [projects, setProjects] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef();
  const showToast = useToast();

  useEffect(() => {
    // Fetch projects for project materials upload
    if (uploadType === "project-materials") {
      loadProjects();
    }
  }, [uploadType]);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      showToast("Please select an Excel file.", "warning");
      return;
    }

    if (uploadType === "project-materials" && !selectedProject) {
      showToast("Please select a project.", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    
    if (uploadType === "project-materials") {
      formData.append("projectId", selectedProject);
    }

    setUploading(true);
    setResult(null);

    try {
      const endpoint = getEndpoint();
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setResult({
        success: true,
        ...data,
      });

      // Reset file input
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setResult({
        success: false,
        message: err.message || "Error uploading file",
      });
    } finally {
      setUploading(false);
    }
  };

  const getEndpoint = () => {
    switch (uploadType) {
      case "materials":
        return "/excel/upload-materials";
      case "users":
        return "/excel/upload-users";
      case "project-materials":
        return "/excel/upload-project-materials";
      case "projects":
        return "/excel/upload-projects";
      default:
        return "/excel/upload";
    }
  };

  const downloadTemplate = () => {
    let csvContent = "";
    
    switch (uploadType) {
      case "materials":
        csvContent = "№,კოდი,დასახელება,საზომი ერთეული,ჯამი\n1,9820136,Sample Material,ც,7.00";
        break;
      case "users":
        csvContent = "Name,Email,Phone,Role,Password\nJohn Doe,john@ips.ge,555-0100,driver,changeme123\nJane Smith,jane@ips.ge,,project_manager,";
        break;
      case "project-materials":
        csvContent = "კოდი,დასახელება,საზომი,საპროექტო\nALT-ZN-32-RAL,კრონშტეინი КР-Н-100/95/80/2,ც,600";
        break;
      case "projects":
        csvContent = "name,projectCode\nBuilding Renovation,P-2024-001\nRoad Construction,P-2024-002";
        break;
      default:
        return;
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${uploadType}-template.csv`;
    link.click();
  };

  return (
    <div className="excel-upload-container">
      <h2>📁 Excel Upload</h2>
      
      <div className="upload-type-selector">
        <label>Upload Type:</label>
        <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
          <option value="materials">Materials</option>
          <option value="users">Users</option>
          <option value="projects">Projects</option>
          <option value="project-materials">Project Materials</option>
        </select>
      </div>

      {uploadType === "project-materials" && (
        <div className="project-selector">
          <label>Select Project:</label>
          <select 
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target.value)}
            required
          >
            <option value="">-- Choose Project --</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectCode} - {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleUpload} className="upload-form">
        <div className="file-input-wrapper">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={uploading}
          />
          {file && <span className="file-name">📄 {file.name}</span>}
        </div>

        <div className="button-group">
          <button 
            type="submit" 
            className="upload-button"
            disabled={uploading || !file}
          >
            {uploading ? "⏳ Uploading..." : "📤 Upload"}
          </button>
          <button 
            type="button" 
            className="template-button"
            onClick={downloadTemplate}
          >
            📥 Download Template
          </button>
        </div>
      </form>

      {result && (
        <div className={`result-box ${result.success ? "success" : "error"}`}>
          <h3>{result.success ? "✅ Success!" : "❌ Error"}</h3>
          {result.success ? (
            <div className="result-details">
              <p>✅ <strong>Added:</strong> {result.added || 0}</p>
              <p>🔄 <strong>Updated:</strong> {result.updated || 0}</p>
              {result.failed > 0 && (
                <p>⚠️ <strong>Failed:</strong> {result.failed}</p>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="error-list">
                  <h4>Errors:</h4>
                  <ul>
                    {result.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p>{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ExcelUpload;
