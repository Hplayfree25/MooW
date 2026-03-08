"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, ImagePlus, X, Folder, FileImage, Loader2, ArrowDownAZ, CalendarCheck, CalendarDays } from 'lucide-react';
import styles from './MediaLibrary.module.css';

import { getMediaLibraryAction, createMediaFolderAction, uploadMediaFileAction } from '@/app/(main)/settings/actions';
import { toast } from 'sonner';
import { CustomDropdown } from '@/components/CustomDropdown';

export function MediaLibraryModal({
    isOpen,
    onClose,
    onSelect
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}) {
    const [folders, setFolders] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'latest' | 'oldest' | 'az'>('latest');

    useEffect(() => {
        if (!isOpen) return;
        fetchMedia();
    }, [isOpen]);

    const fetchMedia = async () => {
        setIsLoading(true);
        const res = await getMediaLibraryAction();
        if (res.success) {
            setFolders(res.folders || []);
            setFiles(res.files || []);
        } else {
            toast.error(res.error || "Failed to load media");
        }
        setIsLoading(false);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderId", currentFolderId || "root");

        const res = await uploadMediaFileAction(formData);
        if (res.success && res.file) {
            setFiles(prev => [res.file, ...prev]);
        } else {
            toast.error(res.error || "Failed finding media");
        }
        setIsLoading(false);
    };

    const handleNewFolder = async () => {
        const name = prompt("Folder Name:");
        if (!name?.trim()) return;

        setIsLoading(true);
        const res = await createMediaFolderAction(name);
        if (res.success && res.folder) {
            setFolders(prev => [res.folder, ...prev]);
        } else {
            toast.error(res.error || "Failed to make folder");
        }
        setIsLoading(false);
    };

    if (!isOpen) return null;

    let filteredFiles = files.filter(f => currentFolderId ? f.folderId === currentFolderId : !f.folderId);
    if (sortOrder === "latest") {
        filteredFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOrder === "oldest") {
        filteredFiles.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortOrder === "az") {
        filteredFiles.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    return (
        <AnimatePresence>
            <div className={styles.overlay} onClick={onClose}>
                <motion.div
                    className={styles.modal}
                    onClick={e => e.stopPropagation()}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                >
                    <div className={styles.header}>
                        <h2>Media Library</h2>
                        <button onClick={onClose} className={styles.iconBtn}><X /></button>
                    </div>

                    <div className={styles.toolbar}>
                        <div className={styles.toolsLeft}>
                            {currentFolderId && (
                                <button className={styles.secondaryBtn} onClick={() => setCurrentFolderId(null)}>
                                    ← Back
                                </button>
                            )}
                            <button className={styles.secondaryBtn} onClick={handleNewFolder}>
                                <FolderPlus size={16} /> New Folder
                            </button>
                            <label className={styles.primaryBtn} style={{ cursor: 'pointer' }}>
                                <ImagePlus size={16} /> Upload File
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                            </label>
                        </div>
                        <div className={styles.toolsRight}>
                            <div style={{ width: '160px' }}>
                                <CustomDropdown
                                    options={[
                                        { id: "latest", label: "Latest First" },
                                        { id: "oldest", label: "Oldest First" },
                                        { id: "az", label: "A to Z" }
                                    ]}
                                    value={sortOrder}
                                    onChange={(val) => setSortOrder(val as any)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.content}>
                        {isLoading ? (
                            <div className={styles.loader}><Loader2 className="animate-spin" size={32} /></div>
                        ) : (
                            <div className={styles.grid}>
                                {!currentFolderId && folders.map(f => (
                                    <div key={f.id} className={styles.folderCard} onClick={() => setCurrentFolderId(f.id)}>
                                        <Folder size={48} className={styles.folderIcon} />
                                        <p className={styles.truncate}>{f.folderName}</p>
                                    </div>
                                ))}

                                {filteredFiles.map(f => (
                                    <div key={f.id} className={styles.fileCard} onClick={() => onSelect(f.url)}>
                                        <img src={f.url} alt={f.filename} className={styles.filePreview} />
                                        <p className={styles.truncate}>{f.filename}</p>
                                    </div>
                                ))}

                                {(!currentFolderId && folders.length === 0 && filteredFiles.length === 0) && (
                                    <div className={styles.emptyState}>No media found. Upload something!</div>
                                )}
                                {(currentFolderId && filteredFiles.length === 0) && (
                                    <div className={styles.emptyState}>This folder is empty.</div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
