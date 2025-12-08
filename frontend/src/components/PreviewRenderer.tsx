"use client";

import React from "react";
import { isImage, isPDF, isVideo, isAudio, isText } from "@/lib/fileUtils";

interface Props {
  filename: string;
  preview_url?: string | null;
  textContent?: string | null;
  className?: string;
}

export default function PreviewRenderer({ filename, preview_url, textContent, className = "" }: Props) {
  if (!filename) return null;

  // IMAGE
  if (isImage(filename) && preview_url) {
    return <img src={preview_url} className={`rounded-lg max-w-full ${className}`} alt={filename} />;
  }

  // PDF
  if (isPDF(filename) && preview_url) {
    return <iframe src={`${preview_url}#view=FitH`} className={`w-full h-[80vh] rounded-lg ${className}`} />;
  }

  // VIDEO
  if (isVideo(filename) && preview_url) {
    return <video src={preview_url} controls className={`w-full rounded-lg ${className}`} />;
  }

  // AUDIO
  if (isAudio(filename) && preview_url) {
    return <audio src={preview_url} controls className={`w-full ${className}`} />;
  }

  // TEXT
  if (isText(filename)) {
    if (textContent) {
      return (
        <pre className={`whitespace-pre-wrap text-sm p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 overflow-x-auto ${className}`}>
          {textContent}
        </pre>
      );
    }

    return (
      <div className={`text-center p-6 ${className}`}>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Unable to preview text file</p>
        <p className="text-sm text-gray-500">Use Download to view locally</p>
      </div>
    );
  }

  // Other
  return (
    <div className={`text-center p-6 ${className}`}>
      <div className="text-6xl mb-4">📄</div>
      <p className="text-gray-600 dark:text-gray-400 mb-4">Preview not available for this file type</p>
    </div>
  );
}
