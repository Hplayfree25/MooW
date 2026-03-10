"use client";

import React, { useEffect, useState } from "react";
import { getReportsAction, updateReportStatusAction } from "./actions";
import { banUserAction, deleteCommentAction } from "@/app/(main)/actions";
import { toast } from "sonner";
import { ShieldAlert, Trash, Ban, CheckCircle, XCircle, User, MessageSquare, Flag, Loader2 } from "lucide-react";
import styles from "../admin.module.css";

export default function ReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        setLoading(true);
        const res = await getReportsAction();
        if (res.success) {
            setReports(res.data || []);
        } else {
            toast.error(res.error || "Failed to fetch reports");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleResolve = async (id: string) => {
        const res = await updateReportStatusAction(id, 'resolved');
        if (res.success) {
            toast.success("Report marked as resolved");
            fetchReports();
        } else {
            toast.error(res.error || "Failed to update report");
        }
    };

    const handleDismiss = async (id: string) => {
        const res = await updateReportStatusAction(id, 'dismissed');
        if (res.success) {
            toast.success("Report dismissed");
            fetchReports();
        } else {
            toast.error(res.error || "Failed to update report");
        }
    };

    const handleDeleteComment = async (reportId: string, commentId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;
        const res = await deleteCommentAction(commentId);
        if (res.success) {
            toast.success("Comment deleted");
            handleResolve(reportId);
        } else {
            toast.error(res.error || "Failed to delete comment");
        }
    };

    const handleBanUser = async (reportId: string, username: string, isBanned: boolean) => {
        const action = isBanned ? "unban" : "ban";
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;
        const res = await banUserAction(username, !isBanned);
        if (res.success) {
            toast.success(`User ${isBanned ? 'unbanned' : 'banned'} successfully`);
            if (!isBanned) handleResolve(reportId);
            else fetchReports();
        } else {
            toast.error(res.error || "Failed to update user status");
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
                <Loader2 className="spinner" size={40} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div className={styles.adminPanel}>
            <div className={styles.header}>
                <h1>User Reports</h1>
                <p>Manage reports for comments and profiles.</p>
            </div>

            <div className={styles.statsGrid} style={{ marginBottom: '2rem' }}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}><Flag size={20} /></div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{reports.filter(r => r.status === 'pending').length}</div>
                        <div className={styles.statLabel}>Pending Reports</div>
                    </div>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Reporter</th>
                            <th>Reported Entity</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => (
                            <tr key={report.id}>
                                <td>
                                    {report.reportedCommentId ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <MessageSquare size={16} /> Comment
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <User size={16} /> Profile
                                        </div>
                                    )}
                                </td>
                                <td>@{report.reporterName}</td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600 }}>@{report.reportedUserName}</span>
                                        {report.reportedContent && (
                                            <span style={{ fontSize: '0.8rem', opacity: 0.7, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {report.reportedContent}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>{report.reason}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${styles[report.status]}`}>
                                        {report.status}
                                    </span>
                                </td>
                                <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {report.status === 'pending' && (
                                            <>
                                                {report.reportedCommentId && (
                                                    <button
                                                        className={styles.actionBtn}
                                                        style={{ backgroundColor: '#ef4444' }}
                                                        onClick={() => handleDeleteComment(report.id, report.reportedCommentId)}
                                                        title="Delete Comment"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    className={styles.actionBtn}
                                                    style={{ backgroundColor: report.reportedUserBanned ? '#10b981' : '#f59e0b' }}
                                                    onClick={() => handleBanUser(report.id, report.reportedUserName, report.reportedUserBanned)}
                                                    title={report.reportedUserBanned ? "Unban User" : "Ban User"}
                                                >
                                                    <Ban size={14} />
                                                </button>
                                                <button
                                                    className={styles.actionBtn}
                                                    style={{ backgroundColor: '#10b981' }}
                                                    onClick={() => handleResolve(report.id)}
                                                    title="Mark Resolved"
                                                >
                                                    <CheckCircle size={14} />
                                                </button>
                                                <button
                                                    className={styles.actionBtn}
                                                    style={{ backgroundColor: '#6b7280' }}
                                                    onClick={() => handleDismiss(report.id)}
                                                    title="Dismiss"
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {reports.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No reports found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
