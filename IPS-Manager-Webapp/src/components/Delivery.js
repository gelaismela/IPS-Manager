import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAllRequestsForProject,
  getDrivers,
  assignMaterialRequest,
  createDelivery,
} from "../api/api";
import "../styles/delivery.css";

const Delivery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    driverId: "",
    deliveryDate: "",
  });
  const [materialSelections, setMaterialSelections] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAllRequestsForProject(id);
        setRequests(data);

        // Map requests to material selections, include requestId for assignment
        const allMaterials = data.map((req) => ({
          ...req.material,
          requestedQuantity: req.requestedQuantity,
          assignedQuantity: req.assignedQuantity,
          status: req.status,
          id: req.material.id,
          requestId: req.id, // needed for assignment
        }));
        setMaterialSelections(
          allMaterials.map((mat) => ({
            ...mat,
            selectedQuantity: 0,
            selected: false,
          }))
        );

        const driversData = await getDrivers();
        setDrivers(driversData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDriverSelect = (driverId) => {
    setFormData((prev) => ({
      ...prev,
      driverId: Number(driverId),
    }));
  };

  const handleMaterialSelection = (index, quantityOrToggle) => {
    const updatedSelections = [...materialSelections];
    if (typeof quantityOrToggle === "boolean") {
      // Checkbox toggled
      updatedSelections[index].selected = quantityOrToggle;
      if (!quantityOrToggle) updatedSelections[index].selectedQuantity = 0;
      else if (updatedSelections[index].selectedQuantity === 0)
        updatedSelections[index].selectedQuantity = 1;
    } else {
      // Quantity changed
      updatedSelections[index].selectedQuantity = Math.min(
        Math.max(quantityOrToggle, 0),
        updatedSelections[index].requestedQuantity
      );
      updatedSelections[index].selected = quantityOrToggle > 0;
    }
    setMaterialSelections(updatedSelections);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedMaterials = materialSelections.filter(
      (mat) => mat.selected && mat.selectedQuantity > 0
    );

    if (selectedMaterials.length === 0) {
      alert("Please select at least one material to deliver");
      return;
    }

    const selectedDriver = drivers.find((d) => d.id === formData.driverId);
    if (!selectedDriver) {
      alert("Please select a driver");
      return;
    }

    try {
      for (const mat of selectedMaterials) {
        const deliveryDateToSend = formData.deliveryDate
          ? formData.deliveryDate
          : undefined;

        console.log("Assigning material request:", {
          requestId: mat.requestId,
          driverId: selectedDriver.id,
          assignedQuantity: mat.selectedQuantity,
          deliveryDate: deliveryDateToSend,
        });

        await assignMaterialRequest(
          mat.requestId,
          selectedDriver.id,
          mat.selectedQuantity,
          deliveryDateToSend
        );
      }

      alert("Delivery assigned successfully!");
      navigate("/deliveries");
    } catch (err) {
      console.error("Assignment error:", err);
      alert("Failed to assign delivery");
    }
  };

  if (loading)
    return <div className="delivery-loading">Loading delivery...</div>;
  if (!requests.length)
    return <div>No delivery requests found for this project.</div>;

  const projectInfo = requests[0]?.project;

  return (
    <div className="delivery-container">
      <h2>Assign Delivery for Project: {projectInfo?.name}</h2>
      <div className="delivery-info">
        <h3>Request Details</h3>
        <p>
          <strong>Project Code:</strong> {projectInfo?.projectCode}
        </p>
        <p>
          <strong>Address:</strong> {projectInfo?.address}
        </p>
        <table className="material-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Material Name</th>
              <th>Requested</th>
              <th>Assigned</th>
              <th>Status</th>
              <th>Assign Quantity</th>
              <th>Select</th>
            </tr>
          </thead>
          <tbody>
            {materialSelections.map((mat, index) => (
              <tr key={index}>
                <td>{mat.requestId}</td>
                <td>{mat.name}</td>
                <td>{mat.requestedQuantity}</td>
                <td>{mat.assignedQuantity}</td>
                <td>{mat.status}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    max={mat.requestedQuantity}
                    value={mat.selectedQuantity}
                    onChange={(e) =>
                      handleMaterialSelection(
                        index,
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="quantity-input"
                    disabled={!mat.selected}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={mat.selected}
                    onChange={(e) =>
                      handleMaterialSelection(index, e.target.checked)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="assignment-form">
        <h3>Assignment Details</h3>
        <div className="form-group">
          <label>Select Driver:</label>
          <select
            name="driverId"
            value={formData.driverId}
            onChange={(e) => handleDriverSelect(e.target.value)}
            required
          >
            <option value="">-- Select a driver --</option>
            {drivers.length === 0 ? (
              <option disabled>No drivers available</option>
            ) : (
              drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="form-group">
          <label>Delivery Date:</label>
          <input
            type="date"
            name="deliveryDate"
            value={formData.deliveryDate}
            onChange={handleInputChange}
          />
        </div>
        <button type="submit" className="submit-btn">
          Assign Delivery
        </button>
      </form>
    </div>
  );
};

export default Delivery;
