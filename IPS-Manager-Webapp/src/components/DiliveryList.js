import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllPendingRequests,
  getAllBatches,
  assignBatch,
  deleteBatch,
  getDrivers,
} from "../api/api";
import "../styles/deliveryList.css";
import { useToast } from "../contexts/ToastContext";

const DeliveryList = () => {
  const navigate = useNavigate();
  const showToast = useToast();

  const [mode, setMode] = useState("batch");

  // Batch-Create mode
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assign-Driver mode
  const [batches, setBatches] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [assignForm, setAssignForm] = useState({ driverId: "", deliveryDate: "" });
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await getAllPendingRequests();
        setRequests(data);
      } catch {
        setError("Failed to fetch delivery requests");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  useEffect(() => {
    if (mode === "assign") {
      loadBatches();
      if (drivers.length === 0) loadDrivers();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBatches = async () => {
    setBatchLoading(true);
    try {
      const data = await getAllBatches();
      setBatches(data);
    } catch {
      showToast("Failed to load batches", "error");
    } finally {
      setBatchLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const data = await getDrivers();
      setDrivers(data);
    } catch (err) {
      console.error("Failed to load drivers", err);
    }
  };

  const handleAssignBatch = async (batchId) => {
    if (!assignForm.driverId) { showToast("Please select a driver.", "warning"); return; }
    setIsAssigning(true);
    try {
      await assignBatch(batchId, Number(assignForm.driverId), assignForm.deliveryDate || undefined);
      showToast("Batch assigned successfully!", "success");
      setExpandedBatch(null);
      setAssignForm({ driverId: "", deliveryDate: "" });
      await loadBatches();
    } catch (err) {
      showToast(`Failed to assign: ${err.message}`, "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      await deleteBatch(batchId);
      showToast("Batch cancelled.", "info");
      setBatches((prev) => prev.filter((b) => b.id !== batchId));
      if (expandedBatch === batchId) setExpandedBatch(null);
    } catch (err) {
      showToast(`Failed to delete: ${err.message}`, "error");
    }
  };

  // Group requests by project for the batch-create view
  const grouped = requests.reduce((acc, req) => {
    const projectId = req.project?.id ?? req.projectId;
    if (!projectId) return acc;
    const projectKey = String(projectId);
    if (!acc[projectKey]) acc[projectKey] = [];
    acc[projectKey].push(req);
    return acc;
  }, {});

  const handleProjectClick = (projectId) => {
    navigate(`/delivery/${projectId}`);
  };

  return (
    <div className="delivery-list-main">
      <h2>Delivery Requests</h2>

      {/* ── Mode Slider ── */}
      <div className="mode-slider">
        <button
          className={`mode-btn ${mode === "batch" ? "active" : ""}`}
          onClick={() => setMode("batch")}
        >
          📦 Create Batch
        </button>
        <button
          className={`mode-btn ${mode === "assign" ? "active" : ""}`}
          onClick={() => setMode("assign")}
        >
          🚚 Assign Driver
        </button>
      </div>

      {/* ── Batch-Create Mode: project list ── */}
      {mode === "batch" && (
        <>
          {loading && <div className="delivery-loading">Loading requests...</div>}
          {error && <div className="delivery-error">{error}</div>}
          {!loading && !error && requests.length === 0 && (
            <p>No delivery requests found.</p>
          )}
          {!loading && !error && requests.length > 0 && (
            <ul className="delivery-list">
              {Object.entries(grouped).map(([projectId, reqs]) => {
                let groupStatus = "PENDING";
                if (reqs.every((r) => r.status === "SENT")) groupStatus = "SENT";
                else if (reqs.some((r) => r.status === "PARTIALLY_SENT"))
                  groupStatus = "PARTIALLY_SENT";
                return (
                  <li
                    key={projectId}
                    className="delivery-item"
                    onClick={() => handleProjectClick(projectId)}
                    style={{ cursor: "pointer" }}
                  >
                    <strong>Project:</strong>{" "}
                    {reqs[0].project?.name || reqs[0].projectName || "N/A"}
                    <br />
                    <strong>Status:</strong> {groupStatus}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ── Assign-Driver Mode: one card per saved batch ── */}
      {mode === "assign" && (
        <>
          <div className="batch-list-header">
            <button className="btn-refresh" onClick={loadBatches} disabled={batchLoading}>↻ Refresh</button>
          </div>
          {batchLoading && <div className="delivery-loading">Loading batches...</div>}
          {!batchLoading && batches.length === 0 && (
            <p>No pending batches. Go to "Create Batch", select materials and save a batch first.</p>
          )}
          {!batchLoading && batches.length > 0 && (
            <div className="batch-list">
              {batches.map((batch) => (
                <div key={batch.id} className="batch-card">
                  <div className="batch-card-header">
                    <div className="batch-project-name">
                      {batch.projectName || batch.project?.name || "Unknown Project"}
                    </div>
                    <div className="batch-meta">
                      <span className={`batch-status-badge batch-status--${(batch.status || "pending").toLowerCase()}`}>
                        {batch.status || "PENDING"}
                      </span>
                      {batch.createdAt && (
                        <span className="batch-date">{new Date(batch.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="batch-materials">
                    {(batch.materials || []).map((m, i) => (
                      <div key={i} className="batch-material-row">
                        <span className="batch-material-name">{m.materialName || m.name}</span>
                        <span className="batch-material-qty">{m.quantity} {m.unit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="batch-actions">
                      {expandedBatch === batch.id ? (
                        <div className="batch-assign-form">
                          <select
                            value={assignForm.driverId}
                            onChange={(e) => setAssignForm((f) => ({ ...f, driverId: e.target.value }))}
                          >
                            <option value="">-- Select Driver --</option>
                            {drivers.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={assignForm.deliveryDate}
                            onChange={(e) => setAssignForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                          />
                          <div className="batch-assign-btns">
                            <button className="btn-assign-confirm" onClick={() => handleAssignBatch(batch.id)} disabled={isAssigning}>
                              {isAssigning ? "Assigning…" : "Confirm"}
                            </button>
                            <button className="btn-assign-cancel" onClick={() => { setExpandedBatch(null); setAssignForm({ driverId: "", deliveryDate: "" }); }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="batch-action-row">
                          <button className="btn-assign" onClick={() => { setExpandedBatch(batch.id); setAssignForm({ driverId: "", deliveryDate: "" }); }}>
                            Assign Driver →
                          </button>
                          <button className="btn-delete-batch" title="Cancel batch" onClick={() => handleDeleteBatch(batch.id)}>✕</button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeliveryList;
