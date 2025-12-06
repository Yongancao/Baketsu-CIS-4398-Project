"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";

export default function FilesPage() {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
            <div className="p-8">
                <h1 className="text-3xl font-semibold mb-6">Your Files</h1>

                {loading && <p>Loading files…</p>}
                {error && <p className="text-red-500">{error}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file) => (
                        <Link
                            key={file.id}
                            href={`/files/${file.id}`}
                            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
                        >
                            {file.thumbnailUrl && (
                                <img
                                    src={file.thumbnailUrl}
                                    alt={file.filename}
                                    className="w-full h-40 object-cover rounded mb-2"
                                />
                            )}

                            <div className="font-medium">{file.filename}</div>

                            <div className="text-sm text-gray-600">
                                {(file.file_size / 1024).toFixed(1)} KB
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </ProtectedPage>
    );
}
