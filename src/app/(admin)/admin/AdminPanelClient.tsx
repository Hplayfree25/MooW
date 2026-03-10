"use client";

import React, { useState } from "react";
import { grantBadgeAction, banUserAction } from "@/app/(main)/actions";
import { toast } from "sonner";
import { ShieldAlert, Award, UserMinus, Shield, Loader2, UserX, UserCheck } from "lucide-react";
import styles from "./admin.module.css";
import badgesData from "@/config/badges.json";

export default function AdminPanelClient() {
    const [badgeUsername, setBadgeUsername] = useState("");
    const [selectedBadge, setSelectedBadge] = useState<number>(2);
    const [isGranting, setIsGranting] = useState(false);

    const [banUsername, setBanUsername] = useState("");
    const [banStatus, setBanStatus] = useState<boolean>(true);
    const [isBanning, setIsBanning] = useState(false);

    const handleGrantBadge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!badgeUsername.trim() || isGranting) return;
        setIsGranting(true);

        const res = await grantBadgeAction(badgeUsername.trim(), selectedBadge, false);
        if (res.success) {
            toast.success(`Badge granted to ${badgeUsername}!`);
            setBadgeUsername("");
        } else {
            toast.error(res.error || "Failed to grant badge");
        }
        setIsGranting(false);
    };

    const handleRevokeBadge = async () => {
        if (!badgeUsername.trim() || isGranting) return;
        setIsGranting(true);

        const res = await grantBadgeAction(badgeUsername.trim(), selectedBadge, true);
        if (res.success) {
            toast.success(`Badge revoked from ${badgeUsername}!`);
        } else {
            toast.error(res.error || "Failed to revoke badge");
        }
        setIsGranting(false);
    };

    const handleBanUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!banUsername.trim() || isBanning) return;
        setIsBanning(true);

        const res = await banUserAction(banUsername.trim(), banStatus);
        if (res.success) {
            if (banStatus) {
                toast.success(`User ${banUsername} has been BANNED.`);
            } else {
                toast.success(`User ${banUsername} has been UNBANNED.`);
            }
            setBanUsername("");
        } else {
            toast.error(res.error || "Failed to update ban status");
        }
        setIsBanning(false);
    };

    return (
        <div className={styles.adminPanel}>
            <div className={styles.header}>
                <h1>Staff Control Panel</h1>
                <p>Manage platform moderation and creator badges.</p>
            </div>

            <div className={styles.content}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <Award className={styles.cardIcon} size={20} color="var(--accent-primary)" />
                        <h3>Manage Badges</h3>
                    </div>
                    <form onSubmit={handleGrantBadge} className={styles.formGroup}>
                        <div className={styles.inputGroup}>
                            <label>Username</label>
                            <input
                                type="text"
                                value={badgeUsername}
                                onChange={(e) => setBadgeUsername(e.target.value)}
                                placeholder="Enter exact username"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Badge Type</label>
                            <select
                                value={selectedBadge}
                                onChange={(e) => setSelectedBadge(Number(e.target.value))}
                                className={styles.select}
                            >
                                {badgesData.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.rarity})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.actionRow}>
                            <button type="submit" disabled={isGranting || !badgeUsername} className={styles.btnPrimary}>
                                {isGranting ? <Loader2 className="spinner" size={16} /> : <Shield size={16} />}
                                Grant Badge
                            </button>
                            <button type="button" onClick={handleRevokeBadge} disabled={isGranting || !badgeUsername} className={styles.btnDanger}>
                                Revoke Badge
                            </button>
                        </div>
                    </form>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <UserMinus className={styles.cardIcon} size={20} color="#ef4444" />
                        <h3>Ban Management</h3>
                    </div>
                    <form onSubmit={handleBanUser} className={styles.formGroup}>
                        <div className={styles.inputGroup}>
                            <label>Username</label>
                            <input
                                type="text"
                                value={banUsername}
                                onChange={(e) => setBanUsername(e.target.value)}
                                placeholder="Enter exact username"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Action</label>
                            <select
                                value={banStatus ? "true" : "false"}
                                onChange={(e) => setBanStatus(e.target.value === "true")}
                                className={styles.select}
                            >
                                <option value="true">Ban User</option>
                                <option value="false">Unban User</option>
                            </select>
                        </div>
                        <div className={styles.actionRow}>
                            <button type="submit" disabled={isBanning || !banUsername} className={banStatus ? styles.btnDanger : styles.btnSuccess}>
                                {isBanning ? <Loader2 className="spinner" size={16} /> : (banStatus ? <UserX size={16} /> : <UserCheck size={16} />)}
                                {banStatus ? "Execute Ban" : "Lift Ban"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

