"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";

export default function FilesPage() {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [viewMode, setViewMode] = useState<"small" | "medium" | "large" | "details" | "list">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("filesViewMode") as any) || "medium";
        }
        return "medium";
    });

    const handleViewModeChange = (mode: "small" | "medium" | "large" | "details" | "list") => {
        setViewMode(mode);
        localStorage.setItem("filesViewMode", mode);
    };

    async function deleteFile(id) {
        const token = localStorage.getItem("access_token");

        await fetch(`http://127.0.0.1:8000/files/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        setFiles(prev => prev.filter(file => file.id !== id));
    }

    async function downloadFile(id: number, filename: string) {
        const token = localStorage.getItem("access_token");

        const res = await fetch(`http://127.0.0.1:8000/files/${id}/download`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await res.json();
        
        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = data.download_url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Helper to detect image files
    function isImageFile(filename: string) {
        return /\.(png|jpg|jpeg|gif|webp)$/i.test(filename);
    }

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("You must be logged in.");
            setLoading(false);
            return;
        }

        fetch("http://127.0.0.1:8000/files/list", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then(async (fileList) => {
                console.log("fileList =", fileList);

                const enhancedFiles = await Promise.all(
                    fileList.map(async (file: any) => {
                        console.log("Processing file:", file);

                        try {
                            if (!isImageFile(file.filename)) {
                                return file;
                            }

                            const res = await fetch(
                                `http://127.0.0.1:8000/files/${file.id}`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );

                            if (!res.ok) {
                                console.error("Preview fetch failed:", await res.text());
                                return file;
                            }

                            const json = await res.json();

                            return {
                                ...file,
                                thumbnailUrl: json.preview_url,
                            };
                        } catch (err) {
                            console.error("ERROR PROCESSING FILE:", err);
                            return file;
                        }
                    }) // CLOSE map()
                ); // CLOSE Promise.all()

                setFiles(enhancedFiles);
                console.log("SET FILES RAN — enhancedFiles =", enhancedFiles);

            })
            .catch((err) => {
                console.error("Failed during file load:", err);
                setError("Failed to load files.");
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <ProtectedPage>
            <div className="p-8 pt-24">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Your Files</h1>
                    
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</label>
                        <select 
                            value={viewMode}
                            onChange={(e) => handleViewModeChange(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 transition"
                        >
                            <option value="small">Small Icons</option>
                            <option value="medium">Medium Icons</option>
                            <option value="large">Large Icons</option>
                            <option value="details">Details</option>
                            <option value="list">List</option>
                        </select>
                    </div>
                </div>

                {loading && <p>Loading files…</p>}
                {error && <p className="text-red-500">{error}</p>}

                {/* Small Icons View */}
                {viewMode === "small" && (
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {files.map((file) => (
                            <div key={file.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800">
                                <Link href={`/files/${file.id}`} className="block">
                                    {file.thumbnailUrl ? (
                                        <img src={file.thumbnailUrl} alt={file.filename} className="w-full h-16 object-cover rounded mb-1" />
                                    ) : (
                                        <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-1 flex items-center justify-center text-xs">📄</div>
                                    )}
                                    <div className="text-xs truncate text-gray-900 dark:text-gray-100" title={file.filename}>{file.filename}</div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                {/* Medium Icons View */}
                {viewMode === "medium" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {files.map((file) => (
                            <div key={file.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800">
                                <Link href={`/files/${file.id}`} className="block mb-2">
                                    {file.thumbnailUrl ? (
                                        <img src={file.thumbnailUrl} alt={file.filename} className="w-full h-40 object-cover rounded mb-2" />
                                    ) : (
                                        <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center text-4xl">📄</div>
                                    )}
                                </Link>
                                <div className="flex justify-between">
                                    <div className="flex flex-col flex-1 min-w-0 mr-2">
                                        <div className="font-medium truncate text-gray-900 dark:text-gray-100" title={file.filename}>{file.filename}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => downloadFile(file.id, file.filename)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">Download</button>
                                        <button onClick={() => deleteFile(file.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Large Icons View */}
                {viewMode === "large" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {files.map((file) => (
                            <div key={file.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800">
                                <Link href={`/files/${file.id}`} className="block mb-3">
                                    {file.thumbnailUrl ? (
                                        <img src={file.thumbnailUrl} alt={file.filename} className="w-full h-64 object-cover rounded mb-3" />
                                    ) : (
                                        <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded mb-3 flex items-center justify-center text-6xl">📄</div>
                                    )}
                                </Link>
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col flex-1 min-w-0 mr-3">
                                        <div className="font-medium text-lg truncate text-gray-900 dark:text-gray-100" title={file.filename}>{file.filename}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => downloadFile(file.id, file.filename)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">Download</button>
                                        <button onClick={() => deleteFile(file.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Details View */}
                {viewMode === "details" && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                        <table className="w-full">
                            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                <tr>
                                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Preview</th>
                                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Name</th>
                                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Size</th>
                                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Uploaded</th>
                                    <th className="text-right p-3 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((file) => (
                                    <tr key={file.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <td className="p-3">
                                            <Link href={`/files/${file.id}`}>
                                                {file.thumbnailUrl ? (
                                                    <img src={file.thumbnailUrl} alt={file.filename} className="w-12 h-12 object-cover rounded" />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">📄</div>
                                                )}
                                            </Link>
                                        </td>
                                        <td className="p-3">
                                            <Link href={`/files/${file.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 text-gray-900 dark:text-gray-100 truncate block max-w-xs" title={file.filename}>
                                                {file.filename}
                                            </Link>
                                        </td>
                                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</td>
                                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : 'N/A'}</td>
                                        <td className="p-3 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => downloadFile(file.id, file.filename)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm">Download</button>
                                                <button onClick={() => deleteFile(file.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div key={file.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center justify-between bg-white dark:bg-gray-800">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <Link href={`/files/${file.id}`}>
                                        {file.thumbnailUrl ? (
                                            <img src={file.thumbnailUrl} alt={file.filename} className="w-16 h-16 object-cover rounded" />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-2xl">📄</div>
                                        )}
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/files/${file.id}`} className="font-medium hover:text-blue-600 dark:hover:text-blue-400 text-gray-900 dark:text-gray-100 truncate block" title={file.filename}>
                                            {file.filename}
                                        </Link>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => downloadFile(file.id, file.filename)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">Download</button>
                                    <button onClick={() => deleteFile(file.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedPage>
    );
}
