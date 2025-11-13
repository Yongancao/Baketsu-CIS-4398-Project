"use client";
import { useState, DragEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  // Simple auth guard (MVP): redirect if no token
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      router.replace("/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // ✅ Hardcoded S3 client (works in browser for testing)
  const s3 = new S3Client({
    region: "ap-southeast-2",
    credentials: {
      accessKeyId: "x",  //replace this
      secretAccessKey: "x", //replace this
    },
    forcePathStyle: true,
  });

  const bucketName = "memorybucket127214161423";

  // File select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    console.log("📂 Selected files:", selectedFiles.map((f) => f.name));
    setFiles(selectedFiles);
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
    const droppedFiles = e.dataTransfer.files
      ? Array.from(e.dataTransfer.files)
      : [];
    console.log("📥 Dropped files:", droppedFiles.map((f) => f.name));
    setFiles(droppedFiles);
  };

  // Upload to S3 directly
  const handleUpload = async () => {
    if (files.length === 0) {
      alert("Please select a file first!");
      return;
    }

    setUploading(true);
    setMessage("");
    console.log("🚀 Starting upload for", files.length, "file(s)...");

    try {
      for (const file of files) {
        console.log(`🟡 Uploading "${file.name}" (${file.size} bytes)...`);

        // ✅ Convert Blob → ArrayBuffer → Uint8Array for cross-browser compatibility
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: `raw/${file.name}`,
          Body: uint8Array, // ✅ Correct format for SDK + TypeScript
          ContentType: file.type,
        });

        try {
          const response = await s3.send(command);
          console.log(`✅ Success: "${file.name}" uploaded.`, response);
        } catch (uploadError) {
          console.error(`❌ Failed to upload "${file.name}"`, uploadError);
          alert(
            `Error uploading ${file.name}: ${JSON.stringify(uploadError, null, 2)}`
          );
          throw uploadError;
        }
      }

      setMessage(`✅ Uploaded ${files.length} file(s) to S3 successfully`);
      console.log("🎉 All uploads finished successfully.");
      setFiles([]);
    } catch (err) {
      console.error("🔥 S3 Upload Error:", err);
      setMessage("❌ Error uploading to S3");
    } finally {
      console.log("🕓 Upload process finished (success or fail).");
      setUploading(false);
    }
  };

  if (!authChecked) {
    return <div className="flex items-center justify-center min-h-screen">Checking auth...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#151516] text-black dark:text-white">
  <h1 className="text-3xl font-semibold mb-2">Upload to S3 ☁️</h1>
  <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">You are logged in. Token found in localStorage.</p>

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

      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="mt-6 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:bg-gray-400"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      <button
        onClick={() => { localStorage.removeItem("access_token"); router.push("/login"); }}
        className="mt-4 text-xs text-gray-500 underline"
      >
        Logout
      </button>

      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
}
