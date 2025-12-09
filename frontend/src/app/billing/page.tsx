"use client";

import { useEffect, useState } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import { useRouter } from "next/navigation";

interface UsageData {
    current_month_cost: number;
    current_month_gb_hours: number;
    active_files: Array<{
        filename: string;
        size_gb: number;
        days_stored: number;
        cost_this_month: number;
    }>;
    deleted_files: Array<{
        filename: string;
        size_gb: number;
        days_stored: number;
        cost_this_month: number;
    }>;
}

interface Invoice {
    id: number;
    billing_month: number;
    billing_year: number;
    total_gb_hours: number;
    cost_cents: number;
    status: string;
    due_date: string;
    created_at: string;
}

export default function BillingPage() {
    const router = useRouter();
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const PRICE_PER_GB_MONTH = 0.023; // $0.023 per GB per month (AWS S3 Standard pricing)
    const PRICE_PER_GB_DAY = PRICE_PER_GB_MONTH / 30; // Average days in a month

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("Not logged in");
            setLoading(false);
            return;
        }

        try {
            // Fetch current usage
            const usageRes = await fetch("http://localhost:8000/billing/usage", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (usageRes.ok) {
                const usageData = await usageRes.json();
                setUsage(usageData);
            }

            // Fetch invoice history
            const invoicesRes = await fetch("http://localhost:8000/billing/invoices", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (invoicesRes.ok) {
                const invoicesData = await invoicesRes.json();
                setInvoices(invoicesData);
            }
        } catch (err) {
            console.error("Failed to fetch billing data:", err);
            setError("Failed to load billing information");
        } finally {
            setLoading(false);
        }
    };

    const generateTestInvoice = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        try {
            const res = await fetch("http://localhost:8000/billing/generate-invoice", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                alert("Test invoice generated successfully!");
                fetchBillingData();
            } else {
                const error = await res.text();
                alert("Failed to generate invoice: " + error);
            }
        } catch (err) {
            console.error("Failed to generate invoice:", err);
            alert("Failed to generate invoice");
        }
    };

    const formatCurrency = (cents: number) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'failed':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    if (loading) {
        return (
            <ProtectedPage>
                <div className="min-h-screen p-8 pt-24 bg-gray-50 dark:bg-gray-900">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-gray-600 dark:text-gray-400">Loading billing information...</p>
                    </div>
                </div>
            </ProtectedPage>
        );
    }

    return (
        <ProtectedPage>
            <div className="min-h-screen p-8 pt-24 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Billing & Usage
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Monitor your storage usage and manage your billing
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-lg">
                            <p className="text-red-800 dark:text-red-200">{error}</p>
                        </div>
                    )}

                    {/* Pricing Information */}
                    <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
                            💡 How Billing Works
                        </h2>
                        <div className="space-y-3 text-blue-800 dark:text-blue-200">
                            <p>
                                <strong>Pay-as-you-go storage:</strong> You're only charged for what you use, calculated daily.
                            </p>
                            <p>
                                <strong>Pricing (First 50 TB):</strong> ${PRICE_PER_GB_MONTH.toFixed(3)} per GB per month (${PRICE_PER_GB_DAY.toFixed(5)} per GB-day)
                            </p>
                            <p>
                                <strong>How it's calculated:</strong> Storage cost = File Size (GB) × Days Stored × ${PRICE_PER_GB_DAY.toFixed(5)}
                            </p>
                            <p>
                                <strong>Monthly billing:</strong> At the end of each month, we calculate your total usage and generate an invoice.
                            </p>
                            <p>
                                <strong>Example:</strong> A 10GB file stored for the entire month (30 days) costs: 10 GB × 30 days × ${PRICE_PER_GB_DAY.toFixed(5)} = ${(10 * 30 * PRICE_PER_GB_DAY).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Current Month Usage */}
                    {usage && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Current Month Cost
                                </h3>
                                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                    {formatCurrency(usage.current_month_cost)}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    {(usage.current_month_gb_hours / 24).toFixed(2)} GB-days
                                </p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Projected Month End
                                </h3>
                                <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                                    {formatCurrency(usage.current_month_cost)}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    Based on current usage
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Usage Breakdown */}
                    {usage && usage.active_files && usage.active_files.length > 0 && (
                        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    Current Month Breakdown
                                </h2>
                            </div>
                            <div className="p-6">
                                <details className="mb-4">
                                    <summary className="cursor-pointer text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                                        Active Files ({usage.active_files.length})
                                    </summary>
                                    <div className="mt-4 space-y-3">
                                        {usage.active_files.map((file, idx) => (
                                            <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {file.filename}
                                                        </p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                                            {file.size_gb.toFixed(3)} GB × {file.days_stored} days
                                                        </p>
                                                    </div>
                                                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                                        {formatCurrency(file.cost_this_month)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </details>

                                {usage.deleted_files && usage.deleted_files.length > 0 && (
                                    <details>
                                        <summary className="cursor-pointer text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                                            Deleted Files This Month ({usage.deleted_files.length})
                                        </summary>
                                        <div className="mt-4 space-y-3">
                                            {usage.deleted_files.map((file, idx) => (
                                                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {file.filename}
                                                            </p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {file.size_gb.toFixed(3)} GB × {file.days_stored} days
                                                            </p>
                                                        </div>
                                                        <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                                                            {formatCurrency(file.cost_this_month)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Invoice History */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                Invoice History
                            </h2>
                            <button
                                onClick={generateTestInvoice}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                            >
                                Generate Test Invoice
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            {invoices.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <p>No invoices yet. Your first invoice will be generated at the end of the month.</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Period
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Amount
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Due Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {invoices.map((invoice) => (
                                            <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {new Date(invoice.billing_year, invoice.billing_month - 1).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(invoice.cost_cents)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                                        {invoice.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                    {formatDate(invoice.due_date)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => router.push(`/billing/invoice/${invoice.id}`)}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Pricing Details */}
                    <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                            Pricing Details
                        </h2>
                        <div className="space-y-4 text-gray-700 dark:text-gray-300">
                            <div>
                                <h3 className="font-semibold text-lg mb-2">AWS S3 Standard Storage Pricing</h3>
                                <ul className="list-none space-y-2 ml-4">
                                    <li className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                                        <span>First 50 TB / Month</span>
                                        <span className="font-semibold">$0.023 per GB</span>
                                    </li>
                                    <li className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                                        <span>Next 450 TB / Month</span>
                                        <span className="font-semibold">$0.022 per GB</span>
                                    </li>
                                    <li className="flex justify-between pb-2">
                                        <span>Over 500 TB / Month</span>
                                        <span className="font-semibold">$0.021 per GB</span>
                                    </li>
                                </ul>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    * Most users will be in the first pricing tier (First 50 TB)
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Daily Breakdown</h3>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>${PRICE_PER_GB_MONTH.toFixed(3)} per GB per month</li>
                                    <li>${PRICE_PER_GB_DAY.toFixed(5)} per GB per day</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-2">How Charges Work</h3>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>You're charged based on GB-days: the size of your files multiplied by how long they're stored</li>
                                    <li>Charges are calculated daily for accurate billing</li>
                                    <li>If you delete a file mid-month, you only pay for the time it was stored</li>
                                    <li>Invoices are generated automatically at the end of each month</li>
                                    <li>Payment is due within 7 days of invoice generation</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Examples</h3>
                                <div className="space-y-2 ml-4">
                                    <p>
                                        <strong>Example 1:</strong> 100GB file stored for full month (30 days)<br/>
                                        Cost = 100 × 30 × ${PRICE_PER_GB_DAY.toFixed(5)} = ${(100 * 30 * PRICE_PER_GB_DAY).toFixed(2)}
                                    </p>
                                    <p>
                                        <strong>Example 2:</strong> 500GB file stored for 15 days<br/>
                                        Cost = 500 × 15 × ${PRICE_PER_GB_DAY.toFixed(5)} = ${(500 * 15 * PRICE_PER_GB_DAY).toFixed(2)}
                                    </p>
                                    <p>
                                        <strong>Example 3:</strong> 1TB (1000GB) file stored for 1 day<br/>
                                        Cost = 1000 × 1 × ${PRICE_PER_GB_DAY.toFixed(5)} = ${(1000 * 1 * PRICE_PER_GB_DAY).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedPage>
    );
}
