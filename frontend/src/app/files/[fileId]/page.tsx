"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function FilePreviewPage() {
    const { fileId } = useParams();   // ✅ Must use in client components

    const [fileData, setFileData] = useState<any>(null);
    const [textContent, setTextContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // File type helpers
    const isImage = (name: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(name);
    const isPDF = (name: string) => /\.pdf$/i.test(name);
    const isVideo = (name: string) => /\.(mp4|mov|webm)$/i.test(name);
    const isText = (name: string) => /\.(txt|md|log)$/i.test(name);

    useEffect(() => {
        if (!fileId) {
            console.log("fileId missing:", fileId);
            setError("Invalid file ID.");
            setLoading(false);
            return;
        }

        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("Not logged in.");
            setLoading(false);
            return;
        }

        // Fetch file details from backend
        fetch(`http://127.0.0.1:8000/files/${fileId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("File not found");
                return res.json();
            })
            .then(async (data) => {
                console.log("FILE DATA:", data);
                setFileData(data);

                // If it's text, fetch raw content from presigned URL
                if (isText(data.filename)) {
                    const textRes = await fetch(data.preview_url);
                    const text = await textRes.text();
                    setTextContent(text);
                }
            })
            .catch((err) => {
                console.error(err);
                setError("Failed to load file preview.");
            })
            .finally(() => setLoading(false));
    }, [fileId]);

    // Rendering states
    if (loading) return <p className="p-8">Loading…</p>;
    if (error) return <p className="p-8 text-red-500">{error}</p>;
    if (!fileData) return <p className="p-8">File not found.</p>;

    return (
        <div className="p-8">
            <Link href="/files" className="text-blue-500 underline">
                ← Back to Files
            </Link>

            <h1 className="text-2xl font-semibold mt-4">{fileData.filename}</h1>
            <p className="text-gray-600">
                {(fileData.file_size / 1024).toFixed(1)} KB • Uploaded{" "}
                {fileData.uploaded_at}
            </p>

            <div className="mt-6 border rounded-lg p-4 bg-gray-50">

                {/* IMAGE */}
                {isImage(fileData.filename) && (
                    <img
                        src={fileData.preview_url}
                        className="rounded-lg max-w-full"
                    />
                )}

                {/* PDF */}
                {isPDF(fileData.filename) && (
                    <iframe
                        src={fileData.preview_url}
                        className="w-full h-[80vh] rounded-lg"
                    />
                )}

                {/* VIDEO */}
                {isVideo(fileData.filename) && (
                    <video
                        src={fileData.preview_url}
                        controls
                        className="w-full rounded-lg"
                    />
                )}

                {/* TEXT */}
                {isText(fileData.filename) && (
                    <pre className="whitespace-pre-wrap text-sm p-4 bg-white border rounded">
                        {textContent}
                    </pre>
                )}

                {/* OTHER FILE TYPES */}
                {!isImage(fileData.filename) &&
                    !isPDF(fileData.filename) &&
                    !isVideo(fileData.filename) &&
                    !isText(fileData.filename) && (
                        <div className="text-center p-6">
                            <a
                                href={fileData.preview_url}
                                download
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Download File
                            </a>
                        </div>
                    )}
            </div>
        </div>
    );
}
