"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getJsonWithAuth, fetchTextUrl } from "@/lib/api";
import { isImage, isPDF, isVideo, isAudio, isText, formatDateTime } from "@/lib/fileUtils";
import PreviewRenderer from "@/components/PreviewRenderer";

export default function FilePreviewPage() {
    const { fileId } = useParams();
    const router = useRouter();
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const folderId = searchParams.get('folderId');

    const [fileData, setFileData] = useState<any>(null);
    const [textContent, setTextContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");

    // File type helpers and formatting are provided by shared utilities in `src/lib`


    async function handleDownload() {
        const token = localStorage.getItem("access_token");
        if (!token || !fileData) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/files/${fileId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            
            const link = document.createElement("a");
            link.href = data.download_url;
            link.download = fileData.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Download failed:", err);
            alert("Failed to download file");
        }
    }

    async function handleDelete() {
        if (!confirm(`Are you sure you want to delete "${fileData.filename}"?`)) return;

        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            await fetch(`http://127.0.0.1:8000/files/${fileId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            alert("File deleted successfully");
            router.push("/files");
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete file");
        }
    }

    function startRename() {
        setIsRenaming(true);
        // Strip extension from filename for editing
        const lastDotIndex = fileData.filename.lastIndexOf('.');
        const nameWithoutExt = lastDotIndex > 0 ? fileData.filename.substring(0, lastDotIndex) : fileData.filename;
        setRenameValue(nameWithoutExt);
    }

    function cancelRename() {
        setIsRenaming(false);
        setRenameValue("");
    }

    async function saveRename() {
        if (!renameValue.trim()) {
            alert("Filename cannot be empty");
            return;
        }

        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            // Preserve the file extension
            const lastDotIndex = fileData.filename.lastIndexOf('.');
            const extension = lastDotIndex > 0 ? fileData.filename.substring(lastDotIndex) : '';
            const newFullFilename = renameValue.trim() + extension;

            const res = await fetch(`http://127.0.0.1:8000/files/${fileId}/rename?new_filename=${encodeURIComponent(newFullFilename)}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(error);
            }

            // Update local state
            setFileData({ ...fileData, filename: newFullFilename });
            setIsRenaming(false);
            setRenameValue("");
        } catch (err: any) {
            console.error(err);
            alert("Failed to rename file: " + err.message);
        }
    }

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
        (async () => {
            try {
                const data = await getJsonWithAuth(`/files/${fileId}`);
                console.log("FILE DATA:", data);
                setFileData(data);

                // If it's text, fetch raw content from presigned URL
                if (isText(data.filename) && data.preview_url) {
                    try {
                        const text = await fetchTextUrl(data.preview_url);
                        setTextContent(text);
                    } catch (err) {
                        console.error("Failed to load text content:", err);
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load file preview.");
            } finally {
                setLoading(false);
            }
        })();
    }, [fileId]);

    // Rendering states
    if (loading) return <p className="p-8">Loading…</p>;
    if (error) return <p className="p-8 text-red-500">{error}</p>;
    if (!fileData) return <p className="p-8">File not found.</p>;

    return (
        <div className="p-8 pt-24">
            <div className="flex justify-between items-center mb-4">
                <Link
                    href={folderId ? `/files/folder/${folderId}` : "/files"}
                    className="text-blue-500 hover:text-blue-700 underline"
                >
                    ← Back to {folderId ? "Folder" : "Files"}
                </Link>
                
                <div className="flex gap-2">
                    {!isRenaming && (
                        <button
                            onClick={startRename}
                            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                            title="Rename"
                        >
                            ✏️ Rename
                        </button>
                    )}
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                        Download
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {isRenaming ? (
                <div className="mt-4 flex items-center gap-2">
                    <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename();
                            if (e.key === 'Escape') cancelRename();
                        }}
                        className="flex-1 px-4 py-2 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white dark:bg-gray-900"
                        autoFocus
                    />
                    <button
                        onClick={saveRename}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        ✓ Save
                    </button>
                    <button
                        onClick={cancelRename}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        ✕ Cancel
                    </button>
                </div>
            ) : (
                <h1 className="text-2xl font-semibold mt-4 text-gray-900 dark:text-white">{fileData.filename}</h1>
            )}
            <p className="text-gray-600 dark:text-gray-400">
                {(fileData.file_size / 1024).toFixed(1)} KB • Uploaded {formatDateTime(fileData.uploaded_at)}
            </p>

            <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">

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
                        src={`${fileData.preview_url}#view=FitH`}
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

                {/* AUDIO */}
                {isAudio(fileData.filename) && (
                    <audio
                        src={fileData.preview_url}
                        controls
                        className="w-full"
                    />
                )}

                {/* TEXT */}
                {isText(fileData.filename) && (
                    <div>
                        {textContent ? (
                            <pre className="whitespace-pre-wrap text-sm p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 overflow-x-auto">
                                {textContent}
                            </pre>
                        ) : (
                            <div className="text-center p-6">
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Unable to preview text file</p>
                                <button
                                    onClick={handleDownload}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                >
                                    Download to View
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* OTHER FILE TYPES */}
                {!isImage(fileData.filename) &&
                    !isPDF(fileData.filename) &&
                    !isVideo(fileData.filename) &&
                    !isAudio(fileData.filename) &&
                    !isText(fileData.filename) && (
                        <div className="text-center p-6">
                            <div className="text-6xl mb-4">📄</div>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">Preview not available for this file type</p>
                            <button
                                onClick={handleDownload}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                Download to View
                            </button>
                        </div>
                    )}
            </div>
        </div>
    );
}
