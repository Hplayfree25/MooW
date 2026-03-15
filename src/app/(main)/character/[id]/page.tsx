"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Heart, Share2, Loader2, Check, X, User, MoreVertical, ChevronDown, Flag, Trash } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { getCharacterByIdAction, likeCharacterAction, unlikeCharacterAction, addCommentAction, toggleCommentReactionAction, deleteCharacterAction, deleteCommentAction, reportAction } from "@/app/(main)/actions";
import { createChatSessionAction } from "@/app/(chat)/actions";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import CharacterNotFound from "@/components/CharacterNotFound";
import styles from "./character.module.css";

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

function CommentItem({ comment, allComments, onReply, onDelete, currentUserId, isStaff, level = 0 }: any) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [showReplies, setShowReplies] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [reactionType, setReactionType] = useState<string | null>(comment?.userReaction || null);
    const [reactions, setReactions] = useState<{ type: string, count: number }[]>(comment?.reactions || []);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        if (comment?.userReaction !== undefined) {
            setReactionType(comment.userReaction);
        }
        if (comment?.reactions !== undefined) {
            setReactions(comment.reactions);
        }
    }, [comment?.userReaction, comment?.reactions]);

    const [showReactions, setShowReactions] = useState(false);
    const pressTimeout = useRef<NodeJS.Timeout | null>(null);
    const hoverTimer = useRef<NodeJS.Timeout | null>(null);

    const replies = (allComments || []).filter((c: any) => c && c.parentId === comment?.id);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        pressTimeout.current = setTimeout(() => {
            setShowReactions(true);
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
        }, 500);
    };

    const handlePointerUp = () => {
        if (pressTimeout.current) {
            clearTimeout(pressTimeout.current);
            pressTimeout.current = null;
        }
    };

    const handleSelectReaction = async (type: string, e?: any) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setShowReactions(false);

        if (reactionType === type) {
            setReactionType(null);
            setReactions(prev => {
                const updated = prev.map(r => r.type === type ? { ...r, count: r.count - 1 } : r).filter(r => r.count > 0);
                return updated.sort((a, b) => b.count - a.count);
            });
            await toggleCommentReactionAction(comment.id, type, false);
        } else {
            const oldType = reactionType;
            setReactionType(type);
            setReactions(prev => {
                let updated = [...prev];
                if (oldType) {
                    updated = updated.map(r => r.type === oldType ? { ...r, count: r.count - 1 } : r).filter(r => r.count > 0);
                }
                const existing = updated.find(r => r.type === type);
                if (existing) {
                    updated = updated.map(r => r.type === type ? { ...r, count: r.count + 1 } : r);
                } else {
                    updated.push({ type, count: 1 });
                }
                return updated.sort((a, b) => b.count - a.count);
            });
            await toggleCommentReactionAction(comment.id, type, true);
        }
    };

    const handlePrimaryClick = (e: React.MouseEvent) => {
        if (pressTimeout.current) {
            clearTimeout(pressTimeout.current);
            pressTimeout.current = null;
        }

        setShowReactions(!showReactions);
    };

    const submitReply = async () => {
        if (!replyText.trim()) return;
        setIsReplying(false);
        await onReply(comment.id, replyText);
        setReplyText("");
        setShowReplies(true);
    };

    const handleReport = async () => {
        const reason = prompt("Enter reason for report:");
        if (!reason) return;
        
        const res = await reportAction({ reportedCommentId: comment.id, reason });
        if (res.success) {
            toast.success("Comment reported successfully");
        } else {
            toast.error(res.error || "Failed to report comment");
        }
        setIsMenuOpen(false);
    };

    const handleDelete = () => {
        onDelete(comment.id);
        setShowDeleteModal(false);
        setIsMenuOpen(false);
    };

    return (
        <div style={{ padding: level === 0 ? '0.5rem 0' : '0' }}>
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showDeleteModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={styles.modalOverlay}
                            onClick={() => setShowDeleteModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className={styles.modalContent}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className={styles.modalTitle}>Delete Comment</h3>
                                <p className={styles.modalText}>Are you sure you want to delete this comment? This action cannot be undone.</p>
                                <div className={styles.modalActions}>
                                    <button className={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                    <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
            <div className={styles.commentContainer} style={{ borderBottom: level > 0 ? 'none' : undefined, padding: level > 0 ? '0.5rem 0' : undefined }}>
                <div className={styles.commentAvatar}>
                    {comment.userImageUrl && comment.userImageUrl.trim() !== "" ? (
                        <img src={comment.userImageUrl} alt={comment.userName} />
                    ) : (
                        <User size={20} />
                    )}
                </div>

                <div className={styles.commentBody}>
                    <div className={styles.commentHeader}>
                        <div>
                            <span className={styles.commentUser}>
                                <Link href={`/profile/${comment.userName}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {comment.userName}
                                </Link>
                            </span>
                            {comment.isVerified && (
                                <div className={styles.badge} title="Verified Creator" style={{ width: '14px', height: '14px', marginLeft: '0.35rem', display: 'inline-flex' }}>
                                    <Check size={10} strokeWidth={3} />
                                </div>
                            )}
                            {comment.isStaff && (
                                <div className={styles.staffBadge} title="Staff" style={{ marginLeft: '0.35rem', fontSize: '0.65rem', padding: '0.1rem 0.3rem', display: 'inline-flex' }}>
                                    STAFF
                                </div>
                            )}
                            <div className={styles.commentMeta} suppressHydrationWarning>
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </div>
                        </div>

                        <div className={styles.commentMenuWrapper}>
                            <button
                                className={styles.commentMenuBtn}
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                title="More options"
                            >
                                <MoreVertical size={16} />
                            </button>
                            <AnimatePresence>
                                {isMenuOpen && (
                                    <>
                                        <div
                                            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                            onClick={() => setIsMenuOpen(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className={styles.commentDropdown}
                                        >
                                            <button className={`${styles.commentDropdownItem} ${styles.warning}`} onClick={handleReport}>
                                                <Flag size={14} /> Report
                                            </button>
                                            {(currentUserId === comment.userId || isStaff) && (
                                                <button className={`${styles.commentDropdownItem} ${styles.danger}`} onClick={() => { setShowDeleteModal(true); setIsMenuOpen(false); }}>
                                                    <Trash size={14} /> Delete
                                                </button>
                                            )}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className={styles.markdownContent} style={{ fontSize: '0.925rem', marginTop: '0.25rem' }}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                            components={markdownComponents}
                            urlTransform={(url) => url}
                        >{comment.content}</ReactMarkdown>
                    </div>

                    <div className={styles.commentActions}>
                        {reactions.map((r, i) => (
                            <button
                                key={r.type}
                                onClick={(e) => handleSelectReaction(r.type, e)}
                                className={`${styles.commentActionBtn} ${reactionType === r.type ? styles.liked : ''}`}
                                style={{
                                    backgroundColor: reactionType === r.type ? 'rgba(var(--accent-primary-rgb), 0.1)' : 'var(--bg-secondary)',
                                    border: reactionType === r.type ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)',
                                    borderRadius: 'var(--radius-full)',
                                    padding: '0.25rem 0.6rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    height: '28px'
                                }}
                            >
                                <span style={{ fontSize: '1rem', lineHeight: 1 }}>{r.type}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: reactionType === r.type ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{r.count}</span>
                            </button>
                        ))}

                        {!reactionType && (
                            <div
                                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                                onMouseEnter={() => {
                                    hoverTimer.current = setTimeout(() => setShowReactions(true), 400);
                                }}
                                onMouseLeave={() => {
                                    if (hoverTimer.current) clearTimeout(hoverTimer.current);
                                    setTimeout(() => {
                                        if (!document.querySelector(`.${styles.reactionPopover}:hover`)) {
                                            setShowReactions(false);
                                        }
                                    }, 300);
                                }}
                            >
                                <button
                                    onPointerDown={handlePointerDown}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                    onClick={handlePrimaryClick}
                                    onContextMenu={(e) => { e.preventDefault(); }}
                                    className={`${styles.commentActionBtn}`}
                                    title="Add Reaction"
                                    style={{
                                        border: '1px solid var(--border-light)',
                                        borderRadius: 'var(--radius-full)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        height: '28px',
                                        padding: '0 0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.2rem',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1 }}>+</span>
                                </button>

                                <AnimatePresence>
                                    {showReactions && (
                                        <>
                                            <div
                                                style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'none' }}
                                                onClick={(e) => { e.stopPropagation(); setShowReactions(false); }}
                                                className="md-backdrop"
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                className={styles.reactionPopover}
                                                onMouseLeave={() => setShowReactions(false)}
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.4rem',
                                                    padding: '0.4rem',
                                                    background: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border-light)',
                                                    borderRadius: 'var(--radius-full)', /* Fully rounded according to theme */
                                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                                                }}
                                            >
                                                {['❤️', '😄', '😎', '💯'].map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        className={styles.reactionEmojiBtn}
                                                        onClick={(e) => handleSelectReaction(emoji, e)}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className={styles.commentActionBtn}
                        >
                            <MessageSquare size={16} /> Reply
                        </button>

                        {replies.length > 0 && (
                            <button
                                onClick={() => setShowReplies(!showReplies)}
                                className={`${styles.commentActionBtn} ${styles.accent}`}
                            >
                                <span>{showReplies ? 'Hide' : 'Show'} Replies ({replies.length})</span>
                                <motion.div animate={{ rotate: showReplies ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                                    <ChevronDown size={16} />
                                </motion.div>
                            </button>
                        )}
                    </div>

                    {isReplying && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'flex-start', overflow: 'hidden' }}
                        >
                            <textarea
                                value={replyText}
                                onChange={(e) => {
                                    setReplyText(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        if (typeof window !== 'undefined' && window.innerWidth > 768) {
                                            e.preventDefault();
                                            submitReply();
                                        }
                                    }
                                }}
                                placeholder="Write a reply..."
                                rows={1}
                                style={{ 
                                    flex: 1, 
                                    padding: '0.6rem 0.85rem', 
                                    borderRadius: 'var(--radius-lg)', 
                                    border: '1px solid var(--border-light)', 
                                    backgroundColor: 'var(--bg-secondary)', 
                                    color: 'var(--text-primary)', 
                                    fontSize: '0.875rem',
                                    resize: 'none',
                                    minHeight: '40px',
                                    outline: 'none',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--accent-primary)';
                                    e.target.style.boxShadow = '0 0 0 1px var(--accent-primary)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--border-light)';
                                    e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.05)';
                                }}
                                autoFocus
                            />
                            <button
                                onClick={submitReply}
                                disabled={!replyText.trim()}
                                style={{ 
                                    padding: '0 1.2rem',
                                    height: '40px',
                                    borderRadius: 'var(--radius-lg)', 
                                    backgroundColor: 'var(--accent-primary)', 
                                    color: 'white', 
                                    border: 'none', 
                                    cursor: !replyText.trim() ? 'not-allowed' : 'pointer', 
                                    fontSize: '0.875rem', 
                                    fontWeight: 600, 
                                    transition: 'background-color 0.2s, opacity 0.2s',
                                    opacity: !replyText.trim() ? 0.6 : 1
                                }}
                            >
                                Send
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showReplies && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className={styles.repliesContainer}
                        style={{ overflow: 'hidden' }}
                    >
                        {replies.map((reply: any) => (
                            <CommentItem key={reply.id} comment={reply} allComments={allComments} onReply={onReply} onDelete={onDelete} currentUserId={currentUserId} isStaff={isStaff} level={level + 1} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

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
    img: ({ node, ...props }: any) => {
        return (
            <img
                {...props}
                loading="lazy"
                className={styles.markdownImage}
                alt={props.alt || "Markdown image"}
            />
        );
    },
    a: ({ node, children, ...props }: any) => (
        <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
    ),
    pre: ({ node, children, ...props }: any) => (
        <pre {...props} className="md-pre">{children}</pre>
    ),
    code: ({ node, inline, className, children, ...props }: any) => (
        inline
            ? <code className="md-inline-code" {...props}>{children}</code>
            : <code className={className} {...props}>{children}</code>
    ),
    table: ({ node, children, ...props }: any) => (
        <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
            <table className="md-table" {...props}>{children}</table>
        </div>
    ),
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

export default function CharacterDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [character, setCharacter] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isLiking, setIsLiking] = useState(false);
    const [hasLiked, setHasLiked] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [isCommenting, setIsCommenting] = useState(false);
    const [isStartingChat, setIsStartingChat] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [showFullAvatar, setShowFullAvatar] = useState(false);
    const [actionError, setActionError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        async function fetchCharacter() {
            if (!params?.id) return;
            const res = await getCharacterByIdAction(params.id as string) as any;
            if (res.success && res.data) {
                setCharacter(res.data);
                setComments(res.comments || []);
                setHasLiked(res.data.hasLiked || false);
            } else {
                setError(res.error || "Character not found.");
            }
            setIsLoading(false);
        }
        fetchCharacter();
    }, [params]);

    const handleShare = async () => {
        setShowShareModal(true);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const handleDeleteCharacter = async () => {
        if (!character?.id) return;
        setIsDeleting(true);
        const res = await deleteCharacterAction(character.id);
        if (res.success) {
            toast.success("Character deleted successfully!");
            router.push("/");
        } else {
            toast.error(res.error || "Failed to delete character.");
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleLikeToggle = async () => {
        if (isLiking || !character?.id) return;
        setIsLiking(true);

        if (hasLiked) {
            setCharacter((prev: any) => ({ ...prev, likesCount: Math.max(0, (prev.likesCount || 0) - 1) }));
            setHasLiked(false);
            const res = await unlikeCharacterAction(character.id);
            if (!res.success) {
                setActionError(res.error || "Failed to unlike character.");
                setCharacter((prev: any) => ({ ...prev, likesCount: (prev.likesCount || 0) + 1 }));
                setHasLiked(true);
            }
        } else {

            setCharacter((prev: any) => ({ ...prev, likesCount: (prev.likesCount || 0) + 1 }));
            setHasLiked(true);
            const res = await likeCharacterAction(character.id);
            if (!res.success) {
                setActionError(res.error || "Failed to like character.");
                setCharacter((prev: any) => ({ ...prev, likesCount: Math.max(0, (prev.likesCount || 0) - 1) }));
                setHasLiked(false);
            }
        }

        setIsLiking(false);
    };

    const handleCommentSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!commentText.trim() || !character?.id || isCommenting) return;
        setIsCommenting(true);

        const res = await addCommentAction(character.id, commentText);
        if (res.success) {
            setComments(prev => [{
                id: res.id,
                characterId: character.id,
                userName: res.userName || "Anonymous User",
                userImageUrl: res.userImageUrl,
                content: commentText,
                createdAt: new Date().toISOString(),
                parentId: null,
                reactions: []
            }, ...prev]);
            setCommentText("");
            
            const textarea = document.getElementById("main-comment-textarea");
            if (textarea) textarea.style.height = 'auto';
        } else {
            setActionError(res.error || "Failed to post comment.");
        }
        setIsCommenting(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!commentId) return;
        const res = await deleteCommentAction(commentId);
        if (res.success) {
            setComments(prev => (prev || []).filter(c => c && c.id !== commentId && c.parentId !== commentId));
            toast.success("Comment deleted");
        } else {
            toast.error(res.error || "Failed to delete comment");
        }
    };

    const handleReply = async (parentId: string, text: string) => {
        if (!character?.id) return;
        const res = await addCommentAction(character.id, text, parentId);
        if (res.success) {
            setComments(prev => [...prev, {
                id: res.id,
                characterId: character.id,
                parentId,
                userName: res.userName || "Anonymous User",
                userImageUrl: res.userImageUrl,
                content: text,
                createdAt: new Date().toISOString(),
                reactions: []
            }]);
        } else {
            setActionError(res.error || "Failed to post reply.");
        }
    };

    if (isLoading) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.headerBar}>
                    <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-full)' }} />
                </div>
                <div className={styles.mainContent}>
                    <div className={styles.sidebarCol}>
                        <div className={`skeleton ${styles.bigAvatar}`} />
                        <div className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-xl)' }} />
                        <div className={`skeleton ${styles.quickStats}`} style={{ height: '140px' }} />
                    </div>
                    <div className={styles.detailsCol}>
                        <div className="skeleton" style={{ height: '48px', width: '50%', marginBottom: '0.5rem' }} />
                        <div className="skeleton" style={{ height: '24px', width: '30%', marginBottom: '2rem' }} />
                        <div className="skeleton" style={{ height: '160px', borderRadius: 'var(--radius-lg)' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !character) {
        return <CharacterNotFound chrno={(params?.id as string) || "unknown"} />;
    }

    return (
        <div className={styles.pageContainer}>
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showDeleteModal && character && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={styles.modalOverlay}
                            onClick={() => setShowDeleteModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className={styles.modalContent}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className={styles.modalTitle}>Delete Character</h3>
                                <p className={styles.modalText}>Are you sure you want to delete <strong>{character.characterName}</strong>? This action cannot be undone and will remove all associated data.</p>
                                <div className={styles.modalActions}>
                                    <button className={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                    <button className={styles.deleteBtn} onClick={handleDeleteCharacter} disabled={isDeleting}>
                                        {isDeleting ? <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : 'Delete'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                    {showShareModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={styles.modalOverlay}
                            onClick={() => setShowShareModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className={`${styles.modalContent} ${styles.shareModalContent}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className={styles.shareIconWrapper}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <motion.path 
                                            d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" 
                                            stroke="var(--accent-primary)" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                        />
                                        <motion.path 
                                            d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" 
                                            stroke="var(--accent-primary)" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: 0.4 }}
                                        />
                                        <motion.path 
                                            d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" 
                                            stroke="var(--accent-primary)" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: 0.6 }}
                                        />
                                        <motion.path 
                                            d="M8.59 13.51L15.42 17.49" 
                                            stroke="var(--accent-primary)" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: 0.8 }}
                                        />
                                        <motion.path 
                                            d="M15.41 6.51001L8.59 10.49" 
                                            stroke="var(--accent-primary)" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: 1.0 }}
                                        />
                                    </svg>
                                </div>
                                <h3 className={styles.modalTitle}>Share Character</h3>
                                <p className={styles.modalText}>Share this character with your friends!</p>
                                <div className={styles.shareLinkBox}>
                                    <input type="text" readOnly value={typeof window !== 'undefined' ? window.location.href : ''} className={styles.shareLinkInput} />
                                    <button className={styles.copyBtn} onClick={handleCopyLink}>
                                        {shareCopied ? <Check size={16} /> : <Share2 size={16} />}
                                        {shareCopied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <div className={styles.modalActions} style={{ width: '100%' }}>
                                    <button className={styles.cancelBtn} style={{ width: '100%' }} onClick={() => setShowShareModal(false)}>Close</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
            <div className={styles.headerBar}>
                <button onClick={() => router.push("/")} className={styles.iconBtn}>
                    <ArrowLeft size={24} />
                </button>
                <div className={styles.headerActions}>
                    <button className={styles.iconBtn} onClick={handleShare} title="Share Character">
                        <Share2 size={20} />
                    </button>
                    {character.isOwner && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => router.push(`/character/${character.id}/edit`)}
                                title="Edit Character"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0 1rem', height: '40px', borderRadius: 'var(--radius-full)',
                                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)',
                                    fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                Edit Character
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setShowDeleteModal(true)}
                                disabled={isDeleting}
                                title="Remove Character"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '40px', height: '40px', borderRadius: 'var(--radius-full)',
                                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)',
                                    color: '#ef4444', cursor: isDeleting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isDeleting ? <Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : <Trash size={18} />}
                            </motion.button>
                        </div>
                    )}
                </div>
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showFullAvatar && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={styles.avatarModalOverlay}
                            onClick={() => setShowFullAvatar(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className={styles.avatarModalContent}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button onClick={() => setShowFullAvatar(false)} className={styles.closeModalBtn}>
                                    <X size={24} />
                                </button>
                                <img
                                    src={character.imageUrl || '/placeholder-avatar.png'}
                                    alt={character.characterName}
                                    className={styles.avatarModalImage}
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <div className={styles.mainContent}>
                <div className={styles.sidebarCol}>
                    <div
                        className={styles.bigAvatar}
                        style={character.imageUrl ? { backgroundImage: `url(${character.imageUrl})` } : { background: 'linear-gradient(135deg, #f43f5e, #f97316)' }}
                        onClick={() => setShowFullAvatar(true)}
                        title="Click to view full image"
                    />

                    <button
                        className={styles.primaryChatBtn}
                        disabled={isStartingChat}
                        style={{ cursor: isStartingChat ? 'not-allowed' : 'pointer', opacity: isStartingChat ? 0.7 : 1 }}
                        onClick={async () => {
                            setIsStartingChat(true);
                            const newChatId = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
                            localStorage.setItem(`chat_session_${newChatId}`, character.id);

                            const res = await createChatSessionAction(character.id, newChatId);
                            if (res.success) {
                                router.push(`/chat/${newChatId}`);
                            } else {
                                setActionError(res.error || "Failed to start chat session.");
                                setIsStartingChat(false);
                            }
                        }}
                    >
                        {isStartingChat ? <Loader2 size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={20} />}
                        {isStartingChat ? "Starting..." : "Chat Now"}
                    </button>

                    <div className={styles.quickStats}>
                        <div className={styles.statBox}>
                            <Heart size={20} color="var(--text-secondary)" />
                            <span>{character.likesCount || 0} Likes</span>
                        </div>
                        <div className={styles.statBox}>
                            <MessageSquare size={20} color="var(--text-secondary)" />
                            <span>{comments.length} Comments</span>
                        </div>
                    </div>
                </div>

                <div className={styles.detailsCol}>
                    <div className={styles.titleSection}>
                        <h1 className={styles.characterName}>{character.characterName}</h1>
                        <div className={styles.creatorInfo}>
                            By <Link href={`/profile/${character.creatorUsername || character.creatorId}`} className={styles.creatorLink} style={{ textDecoration: 'none' }}>
                                <span style={{ color: '#3b82f6', fontWeight: 500 }}>@{character.creatorUsername || character.creatorId || "anonymous"}</span>
                            </Link>
                        </div>
                        <div className={styles.tagsRow}>
                            {character.tags && character.tags.map((tag: string) => (
                                <span key={tag} className={styles.detailTag}>{tag}</span>
                            ))}
                        </div>
                    </div>

                    {character.creatorNotes && (
                        <div className={styles.sectionBlock}>
                            <div className={`${styles.markdownContent} prose`}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                                    components={markdownComponents}
                                    urlTransform={(url) => url}
                                >
                                    {character.creatorNotes}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    <div className={styles.metaFooter} style={{ borderTop: 'none', paddingTop: 0, marginTop: '1rem', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className={styles.metaBadge}>
                            Created: <span style={{ color: 'var(--text-primary)' }}>{character.createdAt ? format(new Date(character.createdAt), "MMM d, yyyy 'at' h:mm a") : "Unknown time"}</span>
                        </div>
                        {character.updatedAt && character.updatedAt !== character.createdAt && (
                            <div className={styles.metaBadge}>
                                Updated: <span style={{ color: 'var(--text-primary)' }}>{format(new Date(character.updatedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                            </div>
                        )}
                        <div className={styles.metaBadge}>
                            Rating: <span style={{ color: character.contentRating === "Limitless" ? '#ef4444' : '#3b82f6' }}>{character.contentRating}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleLikeToggle}
                            disabled={isLiking}
                            className={styles.iconBtn}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-lg)',
                                display: 'flex',
                                gap: '0.5rem',
                                width: 'fit-content',
                                backgroundColor: hasLiked ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                                cursor: isLiking ? 'not-allowed' : 'pointer',
                                color: hasLiked ? '#ef4444' : 'var(--accent-primary)', // Red when liked
                                fontWeight: 600,
                                border: hasLiked ? '1px solid #ef4444' : '1px solid var(--border-light)'
                            }}
                        >
                            <motion.div
                                animate={hasLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                                transition={{ duration: 0.3 }}
                                style={{ display: 'flex', alignItems: 'center' }}
                            >
                                <Heart size={20} fill={hasLiked ? "#ef4444" : "transparent"} color={hasLiked ? "#ef4444" : "currentColor"} />
                            </motion.div>
                            {character.likesCount || 0}
                        </motion.button>
                    </div>

                    <div className={styles.sectionBlock} style={{ marginTop: '2rem' }}>
                        <h3 className={styles.sectionTitle} style={{ fontSize: '1.125rem' }}>Comments ({comments.length})</h3>

                        <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                            Please leave a comment for support creator or feedback creator.
                        </p>

                        <form onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <textarea
                                id="main-comment-textarea"
                                value={commentText}
                                onChange={(e) => {
                                    setCommentText(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        if (typeof window !== 'undefined' && window.innerWidth > 768) {
                                            e.preventDefault();
                                            handleCommentSubmit();
                                        }
                                    }
                                }}
                                placeholder="Add a comment..."
                                disabled={isCommenting}
                                rows={2}
                                style={{ 
                                    width: '100%', 
                                    padding: '0.85rem 1rem', 
                                    borderRadius: 'var(--radius-lg)', 
                                    border: '1px solid var(--border-light)', 
                                    backgroundColor: 'var(--bg-secondary)', 
                                    color: 'var(--text-primary)', 
                                    resize: 'none',
                                    minHeight: '60px',
                                    maxHeight: '200px',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--accent-primary)';
                                    e.target.style.boxShadow = '0 0 0 1px var(--accent-primary)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--border-light)';
                                    e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.05)';
                                }}
                            />
                            <button
                                type="submit"
                                disabled={isCommenting || !commentText.trim()}
                                style={{ 
                                    padding: '0.75rem 1.5rem', 
                                    borderRadius: 'var(--radius-lg)', 
                                    border: 'none', 
                                    backgroundColor: 'var(--accent-primary)', 
                                    color: 'white', 
                                    cursor: (isCommenting || !commentText.trim()) ? 'not-allowed' : 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    fontSize: '0.95rem', 
                                    fontWeight: 600, 
                                    alignSelf: 'flex-end',
                                    opacity: (isCommenting || !commentText.trim()) ? 0.6 : 1,
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                {isCommenting ? (
                                    <><Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} /> Posting...</>
                                ) : (
                                    "Post Comment"
                                )}
                            </button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className={styles.commentsList}>
                                {comments.filter(c => !c.parentId).map(comment => (
                                    <CommentItem key={comment.id} comment={comment} allComments={comments} onReply={handleReply} onDelete={handleDeleteComment} currentUserId={character?.currentUserId} isStaff={character?.isCurrentUserStaff} />
                                ))}
                            </div>
                            {comments.length === 0 && (
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                                    No comments yet. Be the first to share your thoughts!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
