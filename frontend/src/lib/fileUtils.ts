export const isImage = (name: string) => /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(name);
export const isPDF = (name: string) => /\.pdf$/i.test(name);
export const isVideo = (name: string) => /\.(mp4|mov|webm|avi|mkv)$/i.test(name);
export const isAudio = (name: string) => /\.(mp3|wav|ogg|m4a)$/i.test(name);
export const isText = (name: string) => /\.(txt|md|log|json|xml|csv|html|css|js|ts|tsx|jsx|py|java|c|cpp|h|yml|yaml)$/i.test(name);

export const getFileType = (filename: string): "images" | "videos" | "documents" | "audio" | "other" => {
  const ext = filename.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(ext)) return "images";
  if (/\.(mp4|mov|webm|avi|mkv)$/i.test(ext)) return "videos";
  if (/\.(pdf|doc|docx|txt|md|csv|xlsx|xls|ppt|pptx)$/i.test(ext)) return "documents";
  if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(ext)) return "audio";
  return "other";
};

export const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZoneName: 'short'
        });
    } catch {
        return 'N/A';
    }
};
