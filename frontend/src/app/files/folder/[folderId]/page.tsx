"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import Link from "next/link";
import { getJsonWithAuth } from "@/lib/api";
import { isImage, formatDateTime, getFileType } from "@/lib/fileUtils";

interface File {
  id: number;
  filename: string;
  file_size: number;
  uploaded_at: string;
  preview_url?: string;
}

export default function FolderPage() {
  const router = useRouter();
  const pathname = usePathname();
  const folderId = pathname?.split("/").pop();
  const folderIdNum = Number(folderId);

  const [files, setFiles] = useState<File[]>([]);
  const [folderName, setFolderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "images" | "videos" | "documents" | "audio" | "other">("all");
  const [sortBy, setSortBy] = useState<"name" | "size" | "date">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("folderSortBy") as any) || "name";
    return "name";
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("folderSortOrder") as any) || "asc";
    return "asc";
  });
  const [viewMode, setViewMode] = useState<"small" | "medium" | "large" | "details" | "list">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("folderViewMode") as any) || "medium";
    return "medium";
  });
  const [renamingFileId, setRenamingFileId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Filter files
  const filteredFiles = files.filter(file => {
    if (searchQuery && !file.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (fileTypeFilter !== "all" && getFileType(file.filename) !== fileTypeFilter) return false;
    return true;
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
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

  const toggleFileSelection = (fileId: number) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) newSet.delete(fileId);
      else newSet.add(fileId);
      return newSet;
    });
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === sortedFiles.length) setSelectedFiles(new Set());
    else setSelectedFiles(new Set(sortedFiles.map(f => f.id)));
  };

  const startRename = (file: File) => {
    setRenamingFileId(file.id);
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

    try {
      const originalFile = files.find(f => f.id === fileId);
      if (!originalFile) return;
      const lastDotIndex = originalFile.filename.lastIndexOf('.');
      const extension = lastDotIndex > 0 ? originalFile.filename.substring(lastDotIndex) : '';
      const newFullFilename = renameValue.trim() + extension;

      await getJsonWithAuth(`/files/${fileId}/rename?new_filename=${encodeURIComponent(newFullFilename)}`);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, filename: newFullFilename } : f));
      setRenamingFileId(null);
      setRenameValue("");
    } catch (err: any) {
      alert("Failed to rename file: " + err.message);
    }
  };

  const deleteFile = async (id: number) => {
    if (!confirm("Delete this file?")) return;
    try {
      await getJsonWithAuth(`/files/${id}`, { method: "DELETE" });
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      alert("Failed to delete file");
    }
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) return;
    try {
      await Promise.all(Array.from(selectedFiles).map(id => getJsonWithAuth(`/files/${id}`, { method: "DELETE" })));
      setFiles(prev => prev.filter(f => !selectedFiles.has(f.id)));
      setSelectedFiles(new Set());
    } catch (err) {
      alert("Failed to delete files");
    }
  };

  const downloadFile = async (id: number, filename: string) => {
    try {
      const data = await getJsonWithAuth(`/files/${id}/download`);
      const link = document.createElement("a");
      link.href = data.download_url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Failed to download file");
    }
  };

  const moveToRoot = async (id: number) => {
    try {
      await getJsonWithAuth("/folders/move", {
        method: "POST",
        body: JSON.stringify({ file_id: id, folder_id: null }),
        headers: { "Content-Type": "application/json" }
      });
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      alert("Failed to move file: " + err.message);
    }
  };

  const moveSelectedToRoot = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Move ${selectedFiles.size} file(s) to root?`)) return;
    try {
      await Promise.all(Array.from(selectedFiles).map(id => 
        getJsonWithAuth("/folders/move", {
          method: "POST",
          body: JSON.stringify({ file_id: id, folder_id: null }),
          headers: { "Content-Type": "application/json" }
        })
      ));
      setFiles(prev => prev.filter(f => !selectedFiles.has(f.id)));
      setSelectedFiles(new Set());
    } catch (err: any) {
      alert("Failed to move files: " + err.message);
    }
  };

  useEffect(() => {
    if (!folderIdNum) return;
    (async () => {
      try {
        const data = await getJsonWithAuth(`/folders/in_folder/${folderIdNum}`);
        setFiles(data.files);
        setFolderName(data.folder.name);
      } catch (err) {
        console.error(err);
        alert("Failed to load folder");
      }
    })();
  }, [folderIdNum]);

  if (!folderIdNum) return <ProtectedPage><div className="p-8">Invalid folder ID</div></ProtectedPage>;

  return (
    <ProtectedPage>
      <div className="p-8 pt-24 min-h-screen">
        {/* Search and Filter */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Files</option>
              <option value="images">Images</option>
              <option value="videos">Videos</option>
              <option value="documents">Documents</option>
              <option value="audio">Audio</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredFiles.length} of {files.length} files
          </div>
        </div>

        {/* Sort and View Controls */}
        <div className="mb-4 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                localStorage.setItem("folderSortBy", e.target.value);
              }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            >
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="date">Date</option>
            </select>
            <button
              onClick={() => {
                const newOrder = sortOrder === "asc" ? "desc" : "asc";
                setSortOrder(newOrder);
                localStorage.setItem("folderSortOrder", newOrder);
              }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            >
              {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
            </button>
          </div>
          
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">View:</label>
            <select
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value as any);
                localStorage.setItem("folderViewMode", e.target.value);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="small">Small Icons</option>
              <option value="medium">Medium Icons</option>
              <option value="large">Large Icons</option>
              <option value="details">Details</option>
              <option value="list">List</option>
            </select>
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/files" className="text-blue-500 hover:text-blue-700 underline text-sm mb-4 inline-block">← Back to Files</Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold">{folderName}</h1>
            {selectedFiles.size > 0 && (
              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm">{selectedFiles.size} selected</span>
            )}
          </div>
          <div className="flex gap-2">
            {selectedFiles.size > 0 && (
              <>
                <button
                  onClick={selectAllFiles}
                  className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  {selectedFiles.size === sortedFiles.length ? "Deselect All" : "Select All"}
                </button>
                <button
                  onClick={moveSelectedToRoot}
                  className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                >
                  Move to Root
                </button>
                <button
                  onClick={deleteSelectedFiles}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Delete Selected
                </button>
              </>
            )}
          </div>
        </div>

        {/* Small Icons View */}
        {viewMode === "small" && (
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {sortedFiles.map(file => (
              <div
                key={file.id}
                draggable={renamingFileId !== file.id}
                onDragStart={(e) => e.dataTransfer.setData("fileId", String(file.id))}
                className={`border rounded-lg p-2 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 cursor-grab relative ${
                  selectedFiles.has(file.id) ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-1 left-1 w-4 h-4 cursor-pointer z-10"
                />
                <Link href={`/files/${file.id}?folderId=${folderIdNum}`} className="block">
                  {file.preview_url ? (
                    <img src={file.preview_url} alt={file.filename} className="w-full h-16 object-cover rounded mb-1" />
                  ) : (
                    <div className="w-full h-16 bg-gray-200 dark:bg-gray-700 rounded mb-1 flex items-center justify-center">📄</div>
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
            {sortedFiles.map(file => (
              <div
                key={file.id}
                draggable={renamingFileId !== file.id}
                onDragStart={(e) => e.dataTransfer.setData("fileId", String(file.id))}
                className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 cursor-grab relative ${
                  selectedFiles.has(file.id) ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 left-2 w-5 h-5 cursor-pointer z-10"
                />
                <Link href={`/files/${file.id}?folderId=${folderIdNum}`} className="block mb-2">
                  {file.preview_url ? (
                    <img src={file.preview_url} alt={file.filename} className="w-full h-40 object-cover rounded mb-2" />
                  ) : (
                    <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center text-4xl">📄</div>
                  )}
                </Link>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    {renamingFileId === file.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(file.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="w-full px-2 py-1 border border-blue-500 rounded text-gray-900 dark:text-white dark:bg-gray-900 text-sm mb-1"
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="font-medium truncate text-gray-900 dark:text-gray-100" title={file.filename}>{file.filename}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    {renamingFileId === file.id ? (
                      <>
                        <button onClick={() => saveRename(file.id)} className="px-2 py-1 bg-green-500 text-white rounded text-xs">✓</button>
                        <button onClick={cancelRename} className="px-2 py-1 bg-gray-500 text-white rounded text-xs">✕</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startRename(file)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">✏️</button>
                        <button onClick={() => downloadFile(file.id, file.filename)} className="px-2 py-1 bg-blue-500 text-white rounded text-xs">⬇</button>
                        <button onClick={() => deleteFile(file.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">🗑</button>
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
            {sortedFiles.map(file => (
              <div
                key={file.id}
                draggable={renamingFileId !== file.id}
                onDragStart={(e) => e.dataTransfer.setData("fileId", String(file.id))}
                className={`border rounded-lg p-6 shadow-sm hover:shadow-md transition bg-white dark:bg-gray-800 cursor-grab relative ${
                  selectedFiles.has(file.id) ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-3 left-3 w-5 h-5 cursor-pointer z-10"
                />
                <Link href={`/files/${file.id}?folderId=${folderIdNum}`} className="block mb-3">
                  {file.preview_url ? (
                    <img src={file.preview_url} alt={file.filename} className="w-full h-64 object-cover rounded mb-3" />
                  ) : (
                    <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded mb-3 flex items-center justify-center text-6xl">📄</div>
                  )}
                </Link>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    {renamingFileId === file.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(file.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="w-full px-2 py-1 border border-blue-500 rounded text-gray-900 dark:text-white dark:bg-gray-900"
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="font-semibold truncate text-lg text-gray-900 dark:text-gray-100" title={file.filename}>{file.filename}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB • {formatDateTime(file.uploaded_at)}</div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2">
                    {renamingFileId === file.id ? (
                      <>
                        <button onClick={() => saveRename(file.id)} className="px-3 py-1 bg-green-500 text-white rounded">✓</button>
                        <button onClick={cancelRename} className="px-3 py-1 bg-gray-500 text-white rounded">✕</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startRename(file)} className="px-3 py-1 bg-yellow-500 text-white rounded">✏️ Rename</button>
                        <button onClick={() => downloadFile(file.id, file.filename)} className="px-3 py-1 bg-blue-500 text-white rounded">⬇ Download</button>
                        <button onClick={() => deleteFile(file.id)} className="px-3 py-1 bg-red-500 text-white rounded">🗑 Delete</button>
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
                  <th className="px-4 py-2 text-left"><input type="checkbox" checked={selectedFiles.size === sortedFiles.length} onChange={selectAllFiles} /></th>
                  <th className="px-4 py-2 text-left">Filename</th>
                  <th className="px-4 py-2 text-left">Size</th>
                  <th className="px-4 py-2 text-left">Uploaded</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFiles.map(file => (
                  <tr key={file.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2"><input type="checkbox" checked={selectedFiles.has(file.id)} onChange={() => toggleFileSelection(file.id)} /></td>
                    <td className="px-4 py-2">
                      <Link href={`/files/${file.id}?folderId=${folderIdNum}`} className="text-blue-500 hover:text-blue-700">
                        {file.filename}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{(file.file_size / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{formatDateTime(file.uploaded_at)}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button onClick={() => downloadFile(file.id, file.filename)} className="px-2 py-1 text-xs bg-blue-500 text-white rounded">Download</button>
                      <button onClick={() => deleteFile(file.id)} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Delete</button>
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
            {sortedFiles.map(file => (
              <div key={file.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 hover:shadow-md transition flex items-center justify-between">
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  className="w-4 h-4 cursor-pointer"
                />
                <Link href={`/files/${file.id}?folderId=${folderIdNum}`} className="flex-1 ml-3 text-blue-500 hover:text-blue-700">
                  {file.filename}
                </Link>
                <div className="text-sm text-gray-600 dark:text-gray-400 mx-4">{(file.file_size / 1024).toFixed(1)} KB</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mx-4">{formatDateTime(file.uploaded_at)}</div>
                <div className="flex gap-2">
                  <button onClick={() => downloadFile(file.id, file.filename)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded">Download</button>
                  <button onClick={() => deleteFile(file.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sortedFiles.length === 0 && (
          <div className="text-center p-8 text-gray-600 dark:text-gray-400">
            No files in this folder.
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
