"use client";

import React, { useState } from "react";
import { CalendarDays, Check, MapPin, Link as LinkIcon, MoreHorizontal, LayoutGrid, Award, Heart, MessageSquare, Camera, Pin, X, Loader2 } from "lucide-react";

import styles from "./profile.module.css";
import settingsStyles from "../settings/settings.module.css";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import { toast } from "sonner";
import { updateAvatarAction, updateBannerAction, updateShortBioAction, pinCharacterAction } from "../settings/actions";
import { toggleFollowAction } from "../actions";

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
    pinnedCharacterId?: string | null;
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

export default function ClientProfile({ user, badges, characters }: { user: UserProfile, badges: Badge[], characters: Character[] }) {
    const [activeTab, setActiveTab] = useState<"characters" | "badges">("characters");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(user.isFollowing);
    const [followerCount, setFollowerCount] = useState(user.followersCount);
    const [isEditing, setIsEditing] = useState(false);

    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropType, setCropType] = useState<"avatar" | "banner" | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [originalFile, setOriginalFile] = useState<File | null>(null);

    const [bioText, setBioText] = useState(user.bio);
    const [pinnedCharId, setPinnedCharId] = useState(user.pinnedCharacterId);

    const toggleEdit = async () => {
        if (isEditing && bioText !== user.bio) {
            const res = await updateShortBioAction(bioText);
            if (res.success) {
                toast.success("Bio updated!");
            } else {
                toast.error("Failed to update bio");
            }
        }
        setIsEditing(!isEditing);
    };

    const handlePin = async (e: React.MouseEvent, charId: string) => {
        e.preventDefault();
        const newPin = pinnedCharId === charId ? null : charId;
        setPinnedCharId(newPin);
        const res = await pinCharacterAction(newPin);
        if (res?.success) {
            toast.success(newPin ? "Character pinned!" : "Character unpinned!");
        } else {
            setPinnedCharId(pinnedCharId);
            toast.error("Failed to pin character");
        }
    };

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

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setOriginalFile(file);
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropImageSrc(reader.result as string);
                setCropType(type);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
            }, false);
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const handleUploadCroppedImage = async () => {
        if (!cropImageSrc || !croppedAreaPixels || !cropType) return;
        setIsCompressing(true);
        try {
            const formData = new FormData();
            let croppedBlob;

            if (originalFile && originalFile.type === "image/gif") {
                formData.append("image", originalFile);
                formData.append("cropData", JSON.stringify(croppedAreaPixels));
            } else {
                croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
                formData.append("image", croppedBlob, `${cropType}.webp`);
            }

            const action = cropType === "avatar" ? updateAvatarAction : updateBannerAction;
            const result = await action(null, formData);

            if (result && result.error) {
                toast.error(result.error);
            } else if (result && result.success) {
                toast.success(`${cropType === "avatar" ? "Avatar" : "Banner"} updated successfully!`);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to upload image.");
        } finally {
            setIsCompressing(false);
            setCropImageSrc(null);
            setCropType(null);
            setOriginalFile(null);
        }
    };

    const sortedCharacters = [...characters].sort((a, b) => {
        if (a.id === pinnedCharId) return -1;
        if (b.id === pinnedCharId) return 1;
        return 0;
    });

    return (
        <div className={styles.container}>
            <input type="file" id="bannerInput" accept="image/*" style={{ display: 'none' }} onChange={(e) => onFileChange(e, "banner")} />
            <input type="file" id="avatarInput" accept="image/*" style={{ display: 'none' }} onChange={(e) => onFileChange(e, "avatar")} />

            <div className={styles.banner} style={{ backgroundImage: `url(${user.bannerUrl})` }}>
                {isEditing && (
                    <div className={styles.editOverlay} onClick={() => document.getElementById("bannerInput")?.click()}>
                        <Camera size={32} color="white" />
                    </div>
                )}
                {user.isOwner && (
                    <div className={styles.actions}>
                        <button
                            className={`${styles.btnAction} ${isEditing ? styles.btnSave : styles.btnEdit}`}
                            title={isEditing ? "Save Profile" : "Edit Profile"}
                            onClick={toggleEdit}
                        >
                            {isEditing ? "Done" : "Edit Profile"}
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
                        {isEditing && (
                            <div className={styles.editOverlayPfp} onClick={() => document.getElementById("avatarInput")?.click()}>
                                <Camera size={24} color="white" />
                            </div>
                        )}
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

                    {isEditing ? (
                        <textarea
                            className={styles.bioTextarea}
                            value={bioText}
                            onChange={e => setBioText(e.target.value)}
                            rows={3}
                            placeholder="Write a short bio..."
                        />
                    ) : (
                        bioText && (
                            <div className={styles.bio}>
                                {bioText}
                            </div>
                        )
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
                        {sortedCharacters.length === 0 ? (
                            <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                                <LayoutGrid size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <p>No characters created yet.</p>
                            </div>
                        ) : (
                            sortedCharacters.map((char, index) => (
                                <div key={char.id} style={{ position: 'relative' }}>
                                    <Link href={`/character/${char.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                                        <div className={styles.characterCard}>
                                            {pinnedCharId === char.id && (
                                                <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', backgroundColor: 'var(--accent-primary)', color: '#fff', fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', zIndex: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Pin size={12} fill="currentColor" /> Pinned
                                                </div>
                                            )}
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

                                                <div className={styles.cardBio} dangerouslySetInnerHTML={{ __html: char.characterBio }} />

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
                                    {isEditing && (
                                        <button
                                            className={styles.pinBtn}
                                            title={pinnedCharId === char.id ? "Unpin Character" : "Pin Character"}
                                            onClick={(e) => handlePin(e, char.id)}
                                            style={pinnedCharId === char.id ? { backgroundColor: 'var(--accent-primary)', color: '#fff' } : {}}
                                        >
                                            <Pin size={16} fill={pinnedCharId === char.id ? "currentColor" : "none"} />
                                        </button>
                                    )}
                                </div>
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

            <AnimatePresence>
                {cropImageSrc && cropType && (
                    <div className={settingsStyles.modalOverlay} style={{ zIndex: 100 }}>
                        <motion.div
                            className={settingsStyles.modalContent}
                            style={{ maxWidth: '600px' }}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                        >
                            <div className={settingsStyles.modalHeader}>
                                <h3>Crop {cropType === "avatar" ? "Profile Picture" : "Banner"}</h3>
                                <button onClick={() => setCropImageSrc(null)} className={settingsStyles.iconBtn}><X size={20} /></button>
                            </div>
                            <div className={settingsStyles.modalBody} style={{ position: 'relative', height: '400px', padding: 0 }}>
                                <Cropper
                                    image={cropImageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={cropType === "avatar" ? 1 : 3}
                                    cropShape={cropType === "avatar" ? "round" : "rect"}
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            <div className={settingsStyles.modalFooter} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, paddingRight: '20px' }}>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" onClick={() => setCropImageSrc(null)} className={settingsStyles.secondaryBtn}>Cancel</button>
                                    <button type="button" onClick={handleUploadCroppedImage} className={settingsStyles.primaryBtn} disabled={isCompressing}>
                                        {isCompressing ? <Loader2 className="animate-spin" size={16} /> : "Save Image"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

