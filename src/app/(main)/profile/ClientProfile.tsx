"use client";

import React, { useState } from "react";
import { CalendarDays, Check, MapPin, Link as LinkIcon, MoreHorizontal, LayoutGrid, Award, Heart, MessageSquare } from "lucide-react";

import styles from "./profile.module.css";
import Image from "next/image";
import Link from "next/link";

interface UserProfile {
    username: string;
    handle: string;
    avatarUrl: string;
    bannerUrl: string;
    isVerified: boolean;
    followersCount: number;
    joinedAt: string;
    bio: string;
    isOwner: boolean;
    id: string;
    isFollowing: boolean;
}

interface Badge {
    id: number;
    name: string;
    description: string;
    iconUrl: string;
}

interface Character {
    id: string;
    characterName: string;
    imageUrl: string;
    characterBio: string;
    chatCount?: number;
    hasLiked?: boolean;
    likesCount?: number;
    tags?: string[];
    creatorId?: string;
}

import { toggleFollowAction } from "../actions";

export default function ClientProfile({ user, badges, characters }: { user: UserProfile, badges: Badge[], characters: Character[] }) {
    const [activeTab, setActiveTab] = useState<"characters" | "badges">("characters");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(user.isFollowing);
    const [followerCount, setFollowerCount] = useState(user.followersCount);

    const handleFollowToggle = async () => {
        setIsFollowing(!isFollowing);
        setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1);

        const res = await toggleFollowAction(user.id);
        if (!res.success) {
            setIsFollowing(isFollowing);
            setFollowerCount(user.followersCount);
            alert((res as any).error || "Failed to toggle follow");
        }
    };

    const formatCount = (count: number) => {
        if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
        if (count >= 1000) return (count / 1000).toFixed(1) + "K";
        return count.toString();
    };

    return (
        <div className={styles.container}>
            <div className={styles.banner} style={{ backgroundImage: `url(${user.bannerUrl})` }}>
                {user.isOwner && (
                    <div className={styles.actions}>
                        <button className={`${styles.btnAction} ${styles.btnEdit}`} title="Edit Profile">
                            Edit Profile
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className={styles.pfpWrap} style={{ marginTop: 0 }}>
                        <img
                            src={user.avatarUrl}
                            alt={`${user.username}'s avatar`}
                            className={styles.pfp}
                        />
                    </div>

                    {!user.isOwner && (
                        <div className={styles.publicActions}>
                            <button className={`${styles.btnAction} ${isFollowing ? styles.btnEdit : styles.btnFollow}`} onClick={handleFollowToggle}>
                                {isFollowing ? "Unfollow" : "Follow"}
                            </button>

                            <div style={{ position: 'relative' }}>
                                <button
                                    className={`${styles.btnAction} ${styles.btnEdit}`}
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    style={{ padding: '0.5rem', borderRadius: '50%' }}
                                >
                                    <MoreHorizontal size={20} />
                                </button>

                                {isMenuOpen && (
                                    <>
                                        <div
                                            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                            onClick={() => setIsMenuOpen(false)}
                                        />
                                        <div className={styles.dropdownMenu} style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', zIndex: 50, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minWidth: '150px', display: 'flex', flexDirection: 'column' }}>
                                            <button className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}>Report</button>
                                            <button className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}>Block</button>
                                            <button className={styles.dropdownItem} onClick={() => setIsMenuOpen(false)}>Share</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.info}>
                    <div className={styles.unameWrap}>
                        <h1 className={styles.uname}>@{user.username}</h1>
                        {user.isVerified && (
                            <div className={styles.badge} title="Verified">
                                <Check size={14} strokeWidth={3} />
                            </div>
                        )}
                    </div>

                    <div className={styles.meta} style={{ marginTop: '0.75rem' }}>
                        <div className={styles.metaItem} title="Joined At">
                            <CalendarDays size={16} />
                            <span>Joined {user.joinedAt}</span>
                        </div>
                    </div>

                    <div className={styles.stats}>
                        <div className={styles.statItem}>
                            <span className={styles.statVal}>{formatCount(followerCount)}</span>
                            <span className={styles.statLbl}>Followers</span>
                        </div>
                    </div>

                    {user.bio && (
                        <div className={styles.bio}>
                            {user.bio}
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.content}>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'characters' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('characters')}
                    >
                        Characters
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'badges' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('badges')}
                    >
                        Badge Collection
                    </button>
                </div>

                {activeTab === 'characters' && (
                    <div className={styles.characterGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                        {characters.length === 0 ? (
                            <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                                <LayoutGrid size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <p>No characters created yet.</p>
                            </div>
                        ) : (
                            characters.map((char, index) => (
                                <Link href={`/character/${char.id}`} key={char.id} style={{ textDecoration: 'none' }}>
                                    <div className={styles.characterCard}>
                                        {char.imageUrl ? (
                                            <div className={styles.cardAvatar} style={{ backgroundImage: `url(${char.imageUrl})` }} />
                                        ) : (
                                            <div className={`${styles.cardAvatar} ${index % 2 === 0 ? styles.cardAvatarFallback : ''}`} style={index % 2 !== 0 ? { background: 'linear-gradient(135deg, #f43f5e, #f97316)' } : {}} />
                                        )}

                                        <div className={styles.cardContent}>
                                            <div className={styles.cardHeader}>
                                                <div className={styles.cardInfo}>
                                                    <h3 className={styles.cardName}>{char.characterName}</h3>
                                                    <div className={styles.cardCreator}>@{char.creatorId || user.username}</div>
                                                </div>
                                            </div>

                                            <div className={styles.cardBio}>
                                                {char.characterBio}
                                            </div>

                                            <div className={styles.cardTags}>
                                                {char.tags && char.tags.slice(0, 3).map((tag: string) => (
                                                    <span key={tag} className={styles.tag}>{tag}</span>
                                                ))}
                                                {char.tags && char.tags.length > 3 && (
                                                    <span className={styles.tag} style={{ backgroundColor: 'var(--bg-tertiary)', fontWeight: 600 }}>+{char.tags.length - 3}</span>
                                                )}
                                            </div>

                                            <div className={styles.cardFooter} style={{ borderTop: 'none', paddingTop: 0 }}>
                                                <div className={styles.stats}>
                                                    <div className={styles.statItem}>
                                                        <MessageSquare size={14} />
                                                        {char.chatCount || 0}
                                                    </div>
                                                    <div className={styles.statItem}>
                                                        <Heart size={14} fill={char.hasLiked ? "#ef4444" : "transparent"} color={char.hasLiked ? "#ef4444" : "currentColor"} />
                                                        {char.likesCount || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'badges' && (
                    <div className={styles.gridContent}>
                        {badges.length === 0 ? (
                            <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                                <Award size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <p>No badges collected yet.</p>
                            </div>
                        ) : (
                            badges.map(badge => (
                                <div key={badge.id} className={styles.cardItem}>
                                    <div style={{ padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '50%', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={badge.iconUrl} alt={badge.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{badge.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{badge.description}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
