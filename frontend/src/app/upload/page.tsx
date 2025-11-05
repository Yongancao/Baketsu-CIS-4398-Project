"use client";
import { useState, DragEvent } from "react";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // Select files manually
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    setFiles(selectedFiles);
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files
      ? Array.from(e.dataTransfer.files)
      : [];
    setFiles(droppedFiles);
  };

  // Upload logic
  const handleUpload = async () => {
    if (files.length === 0) return alert("Please select a file first!");
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Uploaded ${files.length} file(s) successfully`);
        setFiles([]);
      } else {
        setMessage(`❌ Upload failed: ${data.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Error uploading files");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#151516] text-black dark:text-white">
      <h1 className="text-3xl font-semibold mb-6">Upload to the Cloud ☁️</h1>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 w-96 flex flex-col items-center justify-center transition-colors duration-300 ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-gray-400 hover:border-blue-400"
        }`}
      >
        <p className="text-center mb-4 text-gray-600 dark:text-gray-300">
          {files.length > 0
            ? `${files.length} file(s) selected`
            : "Drag and drop your files here or select below"}
        </p>

        {/* Select File Button */}
        <label
          htmlFor="fileInput"
          className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Select Files
        </label>
        <input
          id="fileInput"
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="mt-6 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:bg-gray-400"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
}
