"use client";
import { useState, DragEvent } from "react";
import ProtectedPage from "@/components/ProtectedPage";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // Select files
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    setFiles(selected);
  };

  // Drag events
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

    const dropped = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    setFiles(dropped);
  };

  // Upload to FASTAPI backend (NOT directly to S3)
  const handleUpload = async () => {
    if (files.length === 0) {
      alert("Please select a file first!");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setMessage("❌ You are not logged in.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      // Build FormData
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file)); // multi-file support
      
      // Send folder name if a folder was selected
      if (folderName) {
        formData.append("folder_name", folderName);
      }

      console.log("📤 Sending files to FastAPI backend...");

      const res = await fetch("http://127.0.0.1:8000/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      console.log("📥 Backend response:", data);

      if (!res.ok) {
        setMessage(`❌ Upload failed: ${data.detail || "Unknown error"}`);
        return;
      }

      setMessage("✅ Upload successful!");
      setFiles([]);
    } catch (error) {
      console.error("🔥 Upload error:", error);
      setMessage("❌ An error occurred while uploading.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#151516] text-black dark:text-white">
        <h1 className="text-3xl font-semibold mb-2">Upload Files ☁️</h1>

        {/* Drag & Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 w-96 flex flex-col items-center justify-center transition ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-gray-400 hover:border-blue-400"
          }`}
        >
          <p className="text-center mb-4">
            {files.length > 0
              ? `${files.length} file(s) selected`
              : "Drag and drop files, or click below"}
          </p>
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
          <label
            htmlFor="folderInput"
            className="cursor-pointer mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Select Folder
          </label>
          <input
            id="folderInput"
            type="file"
            // @ts-ignore webkitdirectory is supported in chromium-based browsers
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={(e) => {
              const selected = e.target.files ? Array.from(e.target.files) : [];
              setFiles(selected);
              // Extract folder name from webkitRelativePath (e.g., "FolderName/file.txt")
              if (selected.length > 0 && (selected[0] as any).webkitRelativePath) {
                const firstPath = (selected[0] as any).webkitRelativePath;
                const folderNameFromPath = firstPath.split('/')[0];
                setFolderName(folderNameFromPath);
              }
            }}
            className="hidden"
          />
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="mt-6 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:bg-gray-400"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {message && <p className="mt-4 text-center">{message}</p>}
      </div>
    </ProtectedPage>
  );
}