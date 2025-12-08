"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";

export default function FilesPage() {
    const [files, setFiles] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "images" | "videos" | "documents" | "audio" | "other">("all");
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
    const [sortBy, setSortBy] = useState<"name" | "size" | "date">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("filesSortBy") as any) || "name";
        }
        return "name";
    });
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("filesSortOrder") as any) || "asc";
        }
        return "asc";
    });
    const [renamingFileId, setRenamingFileId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState("");
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

    // ----------------------
    // DATE FORMATTING
    // ----------------------
    const formatDateTime = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            // Format: MM/DD/YYYY HH:MM (24-hour format)
            return date.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } catch {
            return 'N/A';
        }
    };

    // ----------------------
    // FILTER FUNCTIONS
    // ----------------------
    const getFileType = (filename: string): "images" | "videos" | "documents" | "audio" | "other" => {
        const ext = filename.toLowerCase();
        if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(ext)) return "images";
        if (/\.(mp4|mov|webm|avi|mkv)$/i.test(ext)) return "videos";
        if (/\.(pdf|doc|docx|txt|md|csv|xlsx|xls|ppt|pptx)$/i.test(ext)) return "documents";
        if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(ext)) return "audio";
        return "other";
    };

    const filteredFiles = files.filter(file => {
        // Search filter
        if (searchQuery && !file.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // File type filter
        if (fileTypeFilter !== "all" && getFileType(file.filename) !== fileTypeFilter) {
            return false;
        }

        // Date range filter
        if (dateRange.start || dateRange.end) {
            const fileDate = file.uploaded_at ? new Date(file.uploaded_at) : null;
            if (!fileDate) return false;

            if (dateRange.start) {
                const startDate = new Date(dateRange.start);
                if (fileDate < startDate) return false;
            }

            if (dateRange.end) {
                const endDate = new Date(dateRange.end);
                endDate.setHours(23, 59, 59, 999); // Include the entire end day
                if (fileDate > endDate) return false;
            }
        }

        return true;
    });

    const clearFilters = () => {
        setSearchQuery("");
        setFileTypeFilter("all");
        setDateRange({ start: "", end: "" });
    };

    // ----------------------
    // SORT FUNCTIONS
    // ----------------------
    const sortedAndFilteredFiles = [...filteredFiles].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case "name":
                comparison = a.filename.toLowerCase().localeCompare(b.filename.toLowerCase());
                break;
            case "size":
                comparison = a.file_size - b.file_size;
                break;
            case "date":
                const dateA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
                const dateB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
                comparison = dateA - dateB;
                break;
        }

        return sortOrder === "asc" ? comparison : -comparison;
    });

    const toggleSortOrder = () => {
        setSortOrder(prev => {
            const newOrder = prev === "asc" ? "desc" : "asc";
            localStorage.setItem("filesSortOrder", newOrder);
            return newOrder;
        });
    };

    // ----------------------
    // MULTI-SELECT FUNCTIONS
    // ----------------------
    const toggleFileSelection = (fileId: number) => {
        setSelectedFiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileId)) {
                newSet.delete(fileId);
            } else {
                newSet.add(fileId);
            }
            return newSet;
        });
    };

    const selectAllFiles = () => {
        if (selectedFiles.size === sortedAndFilteredFiles.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(sortedAndFilteredFiles.map(f => f.id)));
        }
    };

    const clearSelection = () => {
        setSelectedFiles(new Set());
    };

    // ----------------------
    // RENAME FUNCTIONS
    // ----------------------
    const startRename = (file: any) => {
        setRenamingFileId(file.id);
        // Strip extension from filename for editing
        const lastDotIndex = file.filename.lastIndexOf('.');
        const nameWithoutExt = lastDotIndex > 0 ? file.filename.substring(0, lastDotIndex) : file.filename;
        setRenameValue(nameWithoutExt);
    };

    const cancelRename = () => {
        setRenamingFileId(null);
        setRenameValue("");
    };

    const saveRename = async (fileId: number) => {
        if (!renameValue.trim()) {
            alert("Filename cannot be empty");
            return;
        }

        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            // Find the original file to get its extension
            const originalFile = files.find(f => f.id === fileId);
            if (!originalFile) return;

            // Preserve the file extension
            const lastDotIndex = originalFile.filename.lastIndexOf('.');
            const extension = lastDotIndex > 0 ? originalFile.filename.substring(lastDotIndex) : '';
            const newFullFilename = renameValue.trim() + extension;

            const res = await fetch(`http://127.0.0.1:8000/files/${fileId}/rename?new_filename=${encodeURIComponent(newFullFilename)}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(error);
            }

            // Update the file in the local state
            setFiles(prev => prev.map(f => 
                f.id === fileId ? { ...f, filename: newFullFilename } : f
            ));

            setRenamingFileId(null);
            setRenameValue("");
        } catch (err: any) {
            console.error(err);
            alert("Failed to rename file: " + err.message);
        }
    };

    async function deleteSelectedFiles() {
        if (selectedFiles.size === 0) return;
        
        if (!confirm(`Delete ${selectedFiles.size} selected file(s)?`)) return;

        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            await Promise.all(
                Array.from(selectedFiles).map(id =>
                    fetch(`http://127.0.0.1:8000/files/${id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                    })
                )
            );

            setFiles(prev => prev.filter(file => !selectedFiles.has(file.id)));
            setSelectedFiles(new Set());
        } catch (err) {
            console.error("Failed to delete files:", err);
            alert("Failed to delete some files");
        }
    }

    async function downloadSelectedFiles() {
        if (selectedFiles.size === 0) return;

        const token = localStorage.getItem("access_token");
        if (!token) return;

        const selectedFileObjects = files.filter(f => selectedFiles.has(f.id));

        for (const file of selectedFileObjects) {
            try {
                const res = await fetch(`http://127.0.0.1:8000/files/${file.id}/download`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await res.json();
                
                // Create link and trigger download
                const link = document.createElement("a");
                link.href = data.download_url;
                link.download = file.filename;
                link.style.display = "none";
                document.body.appendChild(link);
                
                // Trigger download
                link.click();
                
                // Wait longer before removing and starting next download
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Remove link after delay
                document.body.removeChild(link);
            } catch (err) {
                console.error(`Failed to download ${file.filename}:`, err);
                alert(`Failed to download ${file.filename}`);
            }
        }
        
        alert(`${selectedFileObjects.length} file(s) download initiated`);
    }

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

                const enhancedFiles = await Promise.all(
                    fileList.map(async (file: any) => {
                        if (!isImageFile(file.filename)) return file;

                        try {
                            const res = await fetch(
                                `http://127.0.0.1:8000/files/${file.id}`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );

                            if (!res.ok) return file;

                            const json = await res.json();

                            return {
                                ...file,
                                thumbnailUrl: json.preview_url,
                            };
                        } catch {
                            return file;
                        }
                    })
                );

                setFiles(enhancedFiles);

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
            <div className="p-8 pt-24 relative min-h-screen">
                {/* Search and Filter Bar */}
                <div className="mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Input */}
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search files by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* File Type Filter */}
                        <div className="w-full md:w-48">
                            <select
                                value={fileTypeFilter}
                                onChange={(e) => setFileTypeFilter(e.target.value as any)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Types</option>
                                <option value="images">Images</option>
                                <option value="videos">Videos</option>
                                <option value="documents">Documents</option>
                                <option value="audio">Audio</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Date Range Filters */}
                        <div className="flex gap-2">
                            <input
                                type="date"
                                placeholder="Start Date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="date"
                                placeholder="End Date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Clear Filters Button */}
                        {(searchQuery || fileTypeFilter !== "all" || dateRange.start || dateRange.end) && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition whitespace-nowrap"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Results Count */}
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        Showing {filteredFiles.length} of {files.length} files
                        {searchQuery && ` matching "${searchQuery}"`}
                        {fileTypeFilter !== "all" && ` in ${fileTypeFilter}`}
                    </div>
                </div>

                {/* Sort Controls */}
                <div className="mb-4 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                    <select
                        value={sortBy}
                        onChange={(e) => {
                            const newSortBy = e.target.value as any;
                            setSortBy(newSortBy);
                            localStorage.setItem("filesSortBy", newSortBy);
                        }}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                        <option value="date">Date Uploaded</option>
                    </select>
                    <button
                        onClick={toggleSortOrder}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm flex items-center gap-2"
                        title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
                    >
                        {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
                    </button>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Your Files & Folders</h1>
                        {selectedFiles.size > 0 && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">({selectedFiles.size} selected)</span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {selectedFiles.size > 0 && (
                            <>
                                <button
                                    onClick={downloadSelectedFiles}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                >
                                    Download ({selectedFiles.size})
                                </button>
                                <button
                                    onClick={deleteSelectedFiles}
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                                >
                                    Delete ({selectedFiles.size})
                                </button>
                                <button
                                    onClick={clearSelection}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                                >
                                    Clear
                                </button>
                            </>
                        )}
                        {sortedAndFilteredFiles.length > 0 && (
                            <button
                                onClick={selectAllFiles}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-900 dark:text-white"
                            >
                                {selectedFiles.size === sortedAndFilteredFiles.length ? "Deselect All" : "Select All"}
                            </button>
                        )}
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

                {/* Small Icons View */}
                {viewMode === "small" && (
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {folders.map(folder => (
                            <div
                                key={`folder-${folder.id}`}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 cursor-pointer"
                                onDrop={(e) => onDrop(e, folder.id)}
                                onDragOver={onDragOver}
                            >
                                <div className="w-full h-16 flex items-center justify-center text-4xl">📁</div>
                                <div className="text-xs truncate text-gray-900 dark:text-gray-100 text-center" title={folder.name}>{folder.name}</div>
                            </div>
                        ))}
                        {sortedAndFilteredFiles.map((file) => (
                            <div 
                                key={file.id} 
                                draggable={renamingFileId !== file.id}
                                onDragStart={(e) => onDragStart(e, file.id)}
                                className={`border rounded-lg p-2 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 cursor-grab relative ${
                                    selectedFiles.has(file.id) ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-gray-200 dark:border-gray-700'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.has(file.id)}
                                    onChange={() => toggleFileSelection(file.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute top-1 left-1 w-4 h-4 cursor-pointer z-10"
                                />
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
                        {folders.map(folder => (
                            <div
                                key={`folder-${folder.id}`}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer"
                                onDrop={(e) => onDrop(e, folder.id)}
                                onDragOver={onDragOver}
                            >
                                <span className="text-6xl">📁</span>
                                <div className="mt-2 font-medium text-gray-900 dark:text-gray-100">{folder.name}</div>
                            </div>
                        ))}
                        {sortedAndFilteredFiles.map((file) => (
                            <div 
                                key={file.id} 
                                draggable={renamingFileId !== file.id}
                                onDragStart={(e) => onDragStart(e, file.id)}
                                className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 cursor-grab relative ${
                                    selectedFiles.has(file.id) ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-gray-200 dark:border-gray-700'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.has(file.id)}
                                    onChange={() => toggleFileSelection(file.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute top-2 left-2 w-5 h-5 cursor-pointer z-10"
                                />
                                <Link href={`/files/${file.id}`} className="block mb-2">
                                    {file.thumbnailUrl ? (
                                        <img src={file.thumbnailUrl} alt={file.filename} className="w-full h-40 object-cover rounded mb-2" />
                                    ) : (
                                        <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center text-4xl">📄</div>
                                    )}
                                </Link>
                                <div className="flex justify-between">
                                    <div className="flex flex-col flex-1 min-w-0 mr-2">
                                        {renamingFileId === file.id ? (
                                            <div className="flex items-center gap-1 mb-1">
                                                <input
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveRename(file.id);
                                                        if (e.key === 'Escape') cancelRename();
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white dark:bg-gray-900 w-full"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <div className="font-medium truncate text-gray-900 dark:text-gray-100" title={file.filename}>{file.filename}</div>
                                        )}
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</div>
                                    </div>
                                    <div className="flex gap-2">
                                        {renamingFileId === file.id ? (
                                            <>
                                                <button onClick={() => saveRename(file.id)} className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs">✓</button>
                                                <button onClick={cancelRename} className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs">✕</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startRename(file)} className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-xs" title="Rename">✏️</button>
                                                <button onClick={() => downloadFile(file.id, file.filename)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">Download</button>
                                                <button onClick={() => deleteFile(file.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">Delete</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Large Icons View */}
                {viewMode === "large" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {folders.map(folder => (
                            <div
                                key={`folder-${folder.id}`}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer"
                                onDrop={(e) => onDrop(e, folder.id)}
                                onDragOver={onDragOver}
                            >
                                <span className="text-8xl">📁</span>
                                <div className="mt-3 font-medium text-lg text-gray-900 dark:text-gray-100">{folder.name}</div>
                            </div>
                        ))}
                        {sortedAndFilteredFiles.map((file) => (
                            <div 
                                key={file.id} 
                                draggable={renamingFileId !== file.id}
                                onDragStart={(e) => onDragStart(e, file.id)}
                                className={`border rounded-lg p-6 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 cursor-grab relative ${
                                    selectedFiles.has(file.id) ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-gray-200 dark:border-gray-700'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.has(file.id)}
                                    onChange={() => toggleFileSelection(file.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute top-3 left-3 w-5 h-5 cursor-pointer z-10"
                                />
                                <Link href={`/files/${file.id}`} className="block mb-3">
                                    {file.thumbnailUrl ? (
                                        <img src={file.thumbnailUrl} alt={file.filename} className="w-full h-64 object-cover rounded mb-3" />
                                    ) : (
                                        <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded mb-3 flex items-center justify-center text-6xl">📄</div>
                                    )}
                                </Link>
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col flex-1 min-w-0 mr-3">
                                        {renamingFileId === file.id ? (
                                            <div className="flex items-center gap-1 mb-1">
                                                <input
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveRename(file.id);
                                                        if (e.key === 'Escape') cancelRename();
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white dark:bg-gray-900 w-full"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <div className="font-medium text-lg truncate text-gray-900 dark:text-gray-100" title={file.filename}>{file.filename}</div>
                                        )}
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</div>
                                    </div>
                                    <div className="flex gap-2">
                                        {renamingFileId === file.id ? (
                                            <>
                                                <button onClick={() => saveRename(file.id)} className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs">✓</button>
                                                <button onClick={cancelRename} className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs">✕</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startRename(file)} className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-xs" title="Rename">✏️</button>
                                                <button onClick={() => downloadFile(file.id, file.filename)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">Download</button>
                                                <button onClick={() => deleteFile(file.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">Delete</button>
                                            </>
                                        )}
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
                                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100 w-12">
                                        <input
                                            type="checkbox"
                                            checked={sortedAndFilteredFiles.length > 0 && selectedFiles.size === sortedAndFilteredFiles.length}
                                            onChange={selectAllFiles}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Preview</th>
                                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Name</th>
                                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Size</th>
                                    <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Uploaded</th>
                                    <th className="text-right p-3 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {folders.map(folder => (
                                    <tr 
                                        key={`folder-${folder.id}`} 
                                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                                        onDrop={(e) => onDrop(e, folder.id)}
                                        onDragOver={onDragOver}
                                    >
                                        <td className="p-3"></td>
                                        <td className="p-3">
                                            <div className="w-12 h-12 flex items-center justify-center text-2xl">📁</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-gray-900 dark:text-gray-100 font-medium">{folder.name}</span>
                                        </td>
                                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">—</td>
                                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">—</td>
                                        <td className="p-3"></td>
                                    </tr>
                                ))}
                                {sortedAndFilteredFiles.map((file) => (
                                    <tr 
                                        key={file.id} 
                                        draggable={renamingFileId !== file.id}
                                        onDragStart={(e) => onDragStart(e, file.id)}
                                        className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-grab ${
                                            selectedFiles.has(file.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                        }`}
                                    >
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedFiles.has(file.id)}
                                                onChange={() => toggleFileSelection(file.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                        </td>
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
                                            {renamingFileId === file.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={renameValue}
                                                        onChange={(e) => setRenameValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveRename(file.id);
                                                            if (e.key === 'Escape') cancelRename();
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white dark:bg-gray-900"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => saveRename(file.id)}
                                                        className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={cancelRename}
                                                        className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <Link href={`/files/${file.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 text-gray-900 dark:text-gray-100 truncate block max-w-xs" title={file.filename}>
                                                    {file.filename}
                                                </Link>
                                            )}
                                        </td>
                                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</td>
                                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{formatDateTime(file.uploaded_at)}</td>
                                        <td className="p-3 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => startRename(file)} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition text-sm" title="Rename">✏️</button>
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
                        {folders.map(folder => (
                            <div 
                                key={`folder-${folder.id}`} 
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center justify-between bg-white dark:bg-gray-800 cursor-pointer"
                                onDrop={(e) => onDrop(e, folder.id)}
                                onDragOver={onDragOver}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">📁</div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{folder.name}</div>
                                </div>
                            </div>
                        ))}
                        {sortedAndFilteredFiles.map((file) => (
                            <div 
                                key={file.id} 
                                draggable={renamingFileId !== file.id}
                                onDragStart={(e) => onDragStart(e, file.id)}
                                className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center justify-between bg-white dark:bg-gray-800 cursor-grab ${
                                    selectedFiles.has(file.id) ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-gray-200 dark:border-gray-700'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFiles.has(file.id)}
                                    onChange={() => toggleFileSelection(file.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-5 h-5 cursor-pointer mr-4"
                                />
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <Link href={`/files/${file.id}`}>
                                        {file.thumbnailUrl ? (
                                            <img src={file.thumbnailUrl} alt={file.filename} className="w-16 h-16 object-cover rounded" />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-2xl">📄</div>
                                        )}
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        {renamingFileId === file.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveRename(file.id);
                                                        if (e.key === 'Escape') cancelRename();
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white dark:bg-gray-900 flex-1"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => saveRename(file.id)}
                                                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={cancelRename}
                                                    className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <Link href={`/files/${file.id}`} className="font-medium hover:text-blue-600 dark:hover:text-blue-400 text-gray-900 dark:text-gray-100 truncate block" title={file.filename}>
                                                    {file.filename}
                                                </Link>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => startRename(file)} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition" title="Rename">✏️</button>
                                    <button onClick={() => downloadFile(file.id, file.filename)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">Download</button>
                                    <button onClick={() => deleteFile(file.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

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
