"use client";

import { useEffect, useState, useRef } from "react";
import { getUserChatHistoryAction, deleteChatSessionAction } from "@/app/(chat)/actions";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Loader2, Search, ChevronDown, User, Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./chats.module.css";
import Image from "next/image";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CustomDropdown } from "@/components/CustomDropdown";
import { toast } from "sonner";

const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames || []), 'mark', 'span'],
    attributes: {
        ...defaultSchema.attributes,
        span: [...(defaultSchema.attributes?.span || []), 'style', 'className', 'class', 'data-spoiler'],
        div: [...(defaultSchema.attributes?.div || []), 'style', 'align'],
        mark: ['style', 'class', 'className'],
    },
};

const parseInlineStyle = (styleString?: string) => {
    if (!styleString || typeof styleString !== 'string') return undefined;
    const styleObj: any = {};
    styleString.split(';').forEach((s: string) => {
        const [key, ...valueParts] = s.split(':');
        const value = valueParts.join(':');
        if (key && value) {
            const camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
            styleObj[camelKey] = value.trim();
        }
    });
    return Object.keys(styleObj).length > 0 ? styleObj : undefined;
};

const markdownComponents = {
    div: ({ node, align, className, children, ...props }: any) => {
        const alignVal = align || node?.properties?.align;
        return (
            <div className={className} style={alignVal ? { textAlign: alignVal } : undefined} {...props}>
                {children}
            </div>
        );
    },
    span: ({ node, className, children, ...props }: any) => {
        const style = parseInlineStyle(node?.properties?.style);
        const isSpoiler = node?.properties && 'data-spoiler' in node.properties;
        return (
            <span
                className={className || (isSpoiler ? 'spoiler-mark' : undefined)}
                style={style}
                data-spoiler={isSpoiler ? "" : undefined}
                {...props}
            >
                {children}
            </span>
        );
    },
    mark: ({ node, className, children, ...props }: any) => {
        const style = parseInlineStyle(node?.properties?.style);
        return (
            <mark className={className} style={style} {...props}>
                {children}
            </mark>
        );
    }
};

function Skeletons() {
    return (
        <div className={styles.skeletonList}>
            {[1, 2, 3].map(i => (
                <div key={i} className={styles.skeletonCard}>
                    <div className={styles.skeletonHeader}>
                        <div className={styles.skeletonAvatar} />
                        <div className={styles.skeletonTextGroup}>
                            <div className={styles.skeletonTitle} />
                            <div className={styles.skeletonSubtitle} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ChatsHistoryPage() {
    const router = useRouter();
    const [historyGroups, setHistoryGroups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"latest" | "oldest" | "count">("latest");
    const [expandedCharId, setExpandedCharId] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ chatId: string; charId: string; msgCount: number } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        async function fetchHistory() {
            const res = await getUserChatHistoryAction();
            if (res.success && res.data) {
                setHistoryGroups(res.data);
            } else {
                setError(res.error || "Failed to load chat history.");
            }
            setIsLoading(false);
        }
        fetchHistory();
    }, []);

    const totalCharacters = historyGroups?.length || 0;
    const totalMessages = historyGroups?.reduce((acc, group) => acc + (group.totalMessages || 0), 0) || 0;

    const filteredAndSortedGroups = (historyGroups || [])
        .filter(group => group && group.characterName?.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === "latest") {
                return new Date(b.latestUpdate || 0).getTime() - new Date(a.latestUpdate || 0).getTime();
            } else if (sortBy === "oldest") {
                return new Date(a.latestUpdate || 0).getTime() - new Date(b.latestUpdate || 0).getTime();
            } else if (sortBy === "count") {
                return (b.totalMessages || 0) - (a.totalMessages || 0);
            }
            return 0;
        });

    const toggleExpand = (id: string) => {
        setExpandedCharId(prev => (prev === id ? null : id));
    };

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorBox}>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className={styles.retryBtn}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>All Chats</h1>
                <p className={styles.subtitle}>Continue your conversations with your favorite characters.</p>
            </header>

            <div className={styles.controlsWrapper}>
                <div className={styles.searchSortGroup}>
                    <div className={styles.searchContainer}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search characters..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                    <div style={{ width: '180px' }}>
                        <CustomDropdown
                            options={[
                                { id: "latest", label: "Latest" },
                                { id: "oldest", label: "Oldest" },
                                { id: "count", label: "Most Messages" }
                            ]}
                            value={sortBy}
                            onChange={(val) => setSortBy(val as any)}
                        />
                    </div>
                </div>

                <div className={styles.statsContainer}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{totalCharacters}</span>
                        <span className={styles.statLabel}>Characters</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{totalMessages}</span>
                        <span className={styles.statLabel}>Messages</span>
                    </div>
                </div>
            </div>

            <main className={styles.content}>
                {isLoading ? (
                    <Skeletons />
                ) : filteredAndSortedGroups.length === 0 ? (
                    <div className={styles.emptyState}>
                        <MessageSquare size={48} className={styles.emptyIcon} />
                        <h3>No Chats Yet</h3>
                        <p>You haven't started any conversations. Go explore and find a character to chat with!</p>
                        <button className={styles.exploreBtn} onClick={() => router.push('/')}>
                            Explore Characters
                        </button>
                    </div>
                ) : (
                    <div className={styles.characterList}>
                        {filteredAndSortedGroups.map((group, idx) => {
                            const isExpanded = expandedCharId === group.characterId;
                            return (
                                <motion.div
                                    key={group.characterId || idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`${styles.characterCard} ${isExpanded ? styles.characterCardExpanded : ''}`}
                                >
                                    <div className={styles.cardHeader} onClick={() => toggleExpand(group.characterId)}>
                                        <div className={styles.avatarWrapper}>
                                            {group.characterImageUrl ? (
                                                <img src={group.characterImageUrl} alt={group.characterName} className={styles.avatar} />
                                            ) : (
                                                <div className={styles.avatarPlaceholder} />
                                            )}
                                        </div>
                                        <div className={styles.cardInfo}>
                                            <h3 className={styles.characterName}>{group.characterName}</h3>
                                            <span className={styles.messageCount}>
                                                {group.chats?.length || 0} Sessions • {group.totalMessages || 0} Messages
                                            </span>
                                        </div>
                                        <button className={styles.expandBtn}>
                                            <ChevronDown size={20} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                className={styles.cardBodyWrapper}
                                            >
                                                <div className={styles.cardBody}>
                                                    {group.characterDescription && (
                                                        <div className={styles.creatorNotes}>
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                                                                components={markdownComponents}
                                                            >
                                                                {group.characterDescription}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}

                                                    <div className={styles.actionButtons}>
                                                        <button
                                                            className={styles.secondaryBtn}
                                                            onClick={() => router.push(`/character/${group.characterId}`)}
                                                        >
                                                            Character Page
                                                        </button>
                                                        {group.creatorId && (
                                                            <button
                                                                className={styles.secondaryBtn}
                                                                onClick={() => router.push(`/profile/${group.creatorId}`)}
                                                            >
                                                                <User size={16} /> Creator Profile
                                                            </button>
                                                        )}
                                                    </div>

                                                    <h4 className={styles.sessionsTitle}>Chat Sessions</h4>
                                                    <div className={styles.sessionList}>
                                                        {[...(group.chats || [])].sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).map((chat: any) => (
                                                            <div
                                                                key={chat.id}
                                                                className={styles.sessionItem}
                                                                onClick={() => router.push(`/chat/${chat.id}`)}
                                                            >
                                                                <div className={styles.sessionInfo}>
                                                                    <p className={styles.sessionSummary}>
                                                                        {chat.summary
                                                                            || (chat.chatMemory ? chat.chatMemory.slice(0, 80) + (chat.chatMemory.length > 80 ? '...' : '') : "No Have Summary")}
                                                                    </p>
                                                                    <span className={styles.sessionTime}>
                                                                        {chat.updatedAt ? formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true }) : 'Just now'}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.sessionStats}>
                                                                    <span className={styles.sessionMsgCount}>
                                                                        <MessageSquare size={14} /> {chat.messageCount}
                                                                    </span>
                                                                    <button
                                                                        className={styles.deleteBtn}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setDeleteModal({ chatId: chat.id, charId: group.characterId, msgCount: chat.messageCount || 0 });
                                                                        }}
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            <AnimatePresence>
                {deleteModal && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !isDeleting && setDeleteModal(null)}
                    >
                        <motion.div
                            className={styles.modalContent}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles.modalIcon}>
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className={styles.modalTitle}>Delete Chat Session?</h3>
                            <p className={styles.modalDesc}>This will permanently delete this conversation and all its messages. This action cannot be undone.</p>
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.modalCancelBtn}
                                    onClick={() => setDeleteModal(null)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.modalDeleteBtn}
                                    disabled={isDeleting}
                                    onClick={async () => {
                                        setIsDeleting(true);
                                        const res = await deleteChatSessionAction(deleteModal.chatId);
                                        if (res.success) {
                                            setHistoryGroups(prev => prev.map(g => ({
                                                ...g,
                                                chats: g.chats.filter((c: any) => c.id !== deleteModal.chatId),
                                                totalMessages: g.characterId === deleteModal.charId ? g.totalMessages - deleteModal.msgCount : g.totalMessages
                                            })).filter(g => g.chats.length > 0));
                                            toast.success("Chat deleted successfully");
                                        } else {
                                            toast.error(res?.error || "Failed to delete chat");
                                        }
                                        setIsDeleting(false);
                                        setDeleteModal(null);
                                    }}
                                >
                                    {isDeleting ? <Loader2 size={16} className={styles.spinner} /> : <Trash2 size={16} />}
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
