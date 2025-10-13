import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPendingRequests } from "../api/api";
import "../styles/deliveryList.css";

const DeliveryList = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await getAllPendingRequests();
        setRequests(data);
      } catch (err) {
        setError("Failed to fetch delivery requests");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // Group requests by project id
  const grouped = requests.reduce((acc, req) => {
    // Always prefer project.id if available
    const projectId =
      req.project?.id ||
      req.projectId ||
      req.projectCode ||
      req.projectName ||
      "unknown";
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(req);
    return acc;
  }, {});

  // When clicking, navigate using the project id
  const handleProjectClick = (projectId) => {
    navigate(`/delivery/${projectId}`);
  };

  if (loading)
    return <div className="delivery-loading">Loading delivery requests...</div>;
  if (error) return <div className="delivery-error">{error}</div>;

  return (
    <div className="delivery-list-main">
      <h2>Delivery Requests</h2>
      {requests.length === 0 ? (
        <p>No delivery requests found.</p>
      ) : (
        <ul className="delivery-list">
          {Object.entries(grouped).map(([projectId, reqs]) => {
            // Determine group status
            let groupStatus = "PENDING";
            if (reqs.every((r) => r.status === "SENT")) {
              groupStatus = "SENT";
            } else if (reqs.some((r) => r.status === "PARTIALLY_SENT")) {
              groupStatus = "PARTIALLY_SENT";
            }
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
    </div>
  );
};

export default DeliveryList;
