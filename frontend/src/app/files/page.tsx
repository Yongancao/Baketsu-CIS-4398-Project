"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";

export default function FilesPage() {
    const [files, setFiles] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ----------------------
    // DELETE FILE
    // ----------------------
    async function deleteFile(id: number) {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        await fetch(`http://127.0.0.1:8000/files/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        setFiles(prev => prev.filter(file => file.id !== id));
    }

    // ----------------------
    // CREATE FOLDER
    // ----------------------
    async function createFolder() {
        const folderName = prompt("Enter folder name:");
        if (!folderName) return;

        const token = localStorage.getItem("access_token");
        if (!token) {
            alert("Not logged in");
            return;
        }

        try {
            const res = await fetch(
                `http://127.0.0.1:8000/folders/create?name=${encodeURIComponent(folderName)}`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to create folder");
            }

            const newFolder = await res.json();
            setFolders(prev => [newFolder, ...prev]);
        } catch (err: any) {
            console.error(err);
            alert("Failed to create folder: " + err.message);
        }
    }

    // ----------------------
    // FETCH FILES AND FOLDERS
    // ----------------------
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("You must be logged in.");
            setLoading(false);
            return;
        }

        async function fetchData() {
            try {
                const filesRes = await fetch("http://127.0.0.1:8000/files/list", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const fileList = await filesRes.json();
                setFiles(fileList);

                const foldersRes = await fetch("http://127.0.0.1:8000/folders/list", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const folderList = await foldersRes.json();
                setFolders(Array.isArray(folderList) ? folderList : []);
            } catch (err) {
                console.error(err);
                setError("Failed to load files/folders.");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // ----------------------
    // DRAG & DROP HANDLERS
    // ----------------------
    function onDragStart(e: React.DragEvent<HTMLDivElement>, fileId: number) {
        e.dataTransfer.setData("fileId", String(fileId));
    }

    function onDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
    }

    async function onDrop(e: React.DragEvent<HTMLDivElement>, folderId: number) {
        e.preventDefault();

        const fileId = e.dataTransfer.getData("fileId");
        if (!fileId) return;

        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/files/move`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    file_id: Number(fileId),
                    folder_id: folderId
                }),
            });

            if (!res.ok) throw new Error("Failed to move file");

            // Remove moved file from list so it visually disappears
            setFiles(prev => prev.filter(f => f.id !== Number(fileId)));
        } catch (err) {
            console.error(err);
            alert("Failed to move file.");
        }
    }

    // Helper to detect image files
    function isImageFile(filename: string) {
        return /\.(png|jpg|jpeg|gif|webp)$/i.test(filename);
    }

    if (loading) return <p className="p-8">Loading…</p>;
    if (error) return <p className="p-8 text-red-500">{error}</p>;

    return (
        <ProtectedPage>
            <div className="p-8 relative min-h-screen">
                <h1 className="text-3xl font-semibold mb-6">Your Files & Folders</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* FOLDERS */}
                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition flex flex-col items-center justify-center bg-black-100 cursor-pointer"
                            onDrop={(e) => onDrop(e, folder.id)}
                            onDragOver={onDragOver}
                        >
                            <span className="text-6xl">📁</span>
                            <div className="mt-2 font-medium">{folder.name}</div>
                        </div>
                    ))}

                    {/* FILES */}
                    {files.map(file => (
                        <div
                            key={file.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, file.id)}
                            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-grab"
                        >
                            <Link href={`/files/${file.id}`} className="p-4 block">
                                {file.thumbnailUrl && (
                                    <img
                                        src={file.thumbnailUrl}
                                        alt={file.filename}
                                        className="w-full h-40 object-cover rounded mb-2"
                                    />
                                )}
                            </Link>
                            <div className="flex justify-between">
                                <div className="flex flex-col">
                                    <div className="font-medium">{file.filename}</div>
                                    <div className="text-sm text-gray-600">
                                        {(file.file_size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                                <div>
                                    <button
                                        onClick={() => deleteFile(file.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* + BUTTON */}
                <button
                    onClick={createFolder}
                    className="fixed bottom-8 right-8 w-16 h-16 bg-green-600 text-white rounded-full text-4xl flex items-center justify-center shadow-lg hover:bg-green-700 transition"
                    title="Create Folder"
                >
                    +
                </button>
            </div>
        </ProtectedPage>
    );
}
