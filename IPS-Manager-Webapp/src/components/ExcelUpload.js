// You can place this in a new file, e.g. src/components/ExcelUpload.js

import React, { useRef } from "react";
import { API_BASE } from "../api/api";

const ExcelUpload = () => {
  const fileInputRef = useRef();

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current.files[0];
    if (!file) {
      alert("Please select an Excel file.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/excel/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      alert("File uploaded successfully!");
    } catch (err) {
      alert("Error uploading file.");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleUpload}>
      <input
        type="file"
        accept=".xlsx,.xls"
        ref={fileInputRef}
        style={{ marginRight: "8px" }}
      />
      <button type="submit">Upload Excel</button>
    </form>
  );
};

export default ExcelUpload;
