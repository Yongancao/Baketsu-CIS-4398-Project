"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";

// --- Types ---
interface FileItem {
  id: number;
  filename: string;
  file_size: number;
  uploaded_at: string;
}

interface StorageStats {
  total_files: number;
  total_bytes: number;
}

interface BillingStats {
  actual_cost: number;
  estimated_cost: number;
}

interface UserProfile {
  username?: string;
  name?: string; 
  id: number;
}

interface CategoryBreakdown {
  label: string;
  size: number;
  percent: number;
  color: string;
}

// --- Icons ---
const Icons = {
  HardDrive: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>,
  FileText: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  DollarSign: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  Clock: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  UploadCloud: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path><polyline points="16 16 12 12 8 16"></polyline></svg>,
  ArrowRight: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  // File Types
  Image: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  Video: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>,
  Music: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
};

// --- Helpers ---
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "Unknown";
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return dateStr; }
};

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Icons.Image />;
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return <Icons.Video />;
  if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <Icons.Music />;
  return <Icons.FileText />;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<StorageStats>({ total_files: 0, total_bytes: 0 });
  const [billing, setBilling] = useState<BillingStats>({ actual_cost: 0, estimated_cost: 0 });
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);

  const fetchDashboardData = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Please log in to view your dashboard.");
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const API_BASE = "http://127.0.0.1:8000";

    try {
      const [userData, storageData, billingData, filesList] = await Promise.all([
        fetch(`${API_BASE}/auth/me`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/storage`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/files/billing`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/files/list`, { headers }).then(r => r.json())
      ]);

      setUser(userData);
      setStats(storageData);
      setBilling(billingData);

      if (Array.isArray(filesList)) {
        setRecentFiles(filesList.slice(0, 5));
        processBreakdown(filesList);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Unable to load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const processBreakdown = (files: FileItem[]) => {
    const usage = { images: 0, videos: 0, documents: 0, audio: 0, others: 0 };
    
    files.forEach(file => {
      const ext = file.filename.split('.').pop()?.toLowerCase() || '';
      const size = file.file_size;

      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) usage.images += size;
      else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) usage.videos += size;
      else if (['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'csv'].includes(ext)) usage.documents += size;
      else if (['mp3', 'wav', 'ogg'].includes(ext)) usage.audio += size;
      else usage.others += size;
    });

    const total = Object.values(usage).reduce((a, b) => a + b, 0) || 1;

    setBreakdown([
      { label: 'Images', size: usage.images, percent: (usage.images / total) * 100, color: 'bg-indigo-500' },
      { label: 'Videos', size: usage.videos, percent: (usage.videos / total) * 100, color: 'bg-pink-500' },
      { label: 'Documents', size: usage.documents, percent: (usage.documents / total) * 100, color: 'bg-yellow-500' },
      { label: 'Audio', size: usage.audio, percent: (usage.audio / total) * 100, color: 'bg-green-500' },
      { label: 'Others', size: usage.others, percent: (usage.others / total) * 100, color: 'bg-gray-400' },
    ].filter(i => i.size > 0).sort((a, b) => b.size - a.size));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <ProtectedPage>
      <div className="min-h-screen bg-gray-50 dark:bg-[#151516] px-4 md:px-8 pb-12 pt-32 text-gray-900 dark:text-gray-100 transition-colors">
        
        {loading ? (
          <div className="flex flex-col justify-center items-center h-[50vh] text-gray-400 animate-pulse">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p>Loading your dashboard...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-[50vh] text-red-500">
            <p>{error}</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            
            <header className="mb-10">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Welcome back, <span className="font-medium text-gray-900 dark:text-white">{user?.username || user?.name.capitalize()}</span>! Here&apos;s your storage overview.
              </p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              <StatCard 
                title="Used Storage" 
                value={formatBytes(stats.total_bytes)} 
                icon={<Icons.HardDrive />} 
                color="text-blue-600 dark:text-blue-400" 
                bg="bg-blue-50 dark:bg-blue-900/20"
              />
              <StatCard 
                title="Total Files" 
                value={stats.total_files.toString()} 
                icon={<Icons.FileText />} 
                color="text-purple-600 dark:text-purple-400" 
                bg="bg-purple-50 dark:bg-purple-900/20"
              />
              <StatCard 
                title="Current Cost" 
                value={`$${billing.actual_cost.toFixed(10)}`} 
                icon={<Icons.DollarSign />} 
                color="text-green-600 dark:text-green-400" 
                bg="bg-green-50 dark:bg-green-900/20"
              />
              <StatCard 
                title="Est. Monthly" 
                value={`$${billing.estimated_cost.toFixed(10)}`} 
                icon={<Icons.Clock />} 
                color="text-orange-600 dark:text-orange-400" 
                bg="bg-orange-50 dark:bg-orange-900/20"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Storage Usage */}
              <div className="bg-white dark:bg-[#1d1d1d] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-fit">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Storage Usage by Type</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    See how your files occupy space.
                  </p>
                </div>
                
                {breakdown.length > 0 ? (
                  <div className="space-y-6">
                    {breakdown.map((item, idx) => (
                      <div key={idx} className="group">
                        <div className="flex justify-between text-sm mb-2 font-medium">
                          <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                          <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            {formatBytes(item.size)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-out`} 
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <Icons.HardDrive />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">No data available</p>
                    <p className="text-xs text-gray-500 mt-1 mb-4">Upload files to see breakdown.</p>
                  </div>
                )}

                <Link href="/upload" className="block mt-6">
                  <button className="w-full py-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-medium active:scale-[0.98]">
                    <Icons.UploadCloud />
                    <span>Upload New Files</span>
                  </button>
                </Link>
              </div>

              {/* Right Column: Recent Activity */}
              <div className="lg:col-span-2 bg-white dark:bg-[#1d1d1d] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold">Recent Uploads</h2>
                  <Link href="/files" className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-500 font-medium hover:underline">
                    View All Files <Icons.ArrowRight />
                  </Link>
                </div>

                <div className="space-y-3 flex-1">
                  {recentFiles.length > 0 ? (
                    recentFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#252526] hover:bg-gray-100 dark:hover:bg-[#2a2a2b] transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="p-3 bg-white dark:bg-[#151516] rounded-lg border border-gray-100 dark:border-gray-700 shrink-0 text-gray-500 group-hover:text-blue-500 transition-colors">
                            {getFileIcon(file.filename)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px] sm:max-w-md">
                              {file.filename}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatBytes(file.file_size)}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400 whitespace-nowrap pl-4 font-mono text-xs">
                          {formatDate(file.uploaded_at)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400">
                      <p>No recent activity.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

function StatCard({ title, value, icon, color, bg }: { title: string, value: string, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <div className="bg-white dark:bg-[#1d1d1d] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-transform hover:-translate-y-1 duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-2xl font-bold mt-2 text-gray-900 dark:text-white break-all">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${bg} ${color} shrink-0 ml-2`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
