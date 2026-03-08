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
import { getCharacterByIdAction, likeCharacterAction, unlikeCharacterAction, addCommentAction, toggleCommentReactionAction, deleteCharacterAction } from "@/app/(main)/actions";
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

function CommentItem({ comment, allComments, onReply, level = 0 }: any) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [showReplies, setShowReplies] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [reactionType, setReactionType] = useState<string | null>(comment.userReaction || null);
    const [counts, setCounts] = useState({
        like: comment.likesCount || 0,
        laugh: comment.laughCount || 0,
        cool: comment.coolCount || 0,
        thumbsUp: comment.thumbsUpCount || 0
    });

    useEffect(() => {
        if (comment.userReaction !== undefined) {
            setReactionType(comment.userReaction);
        }
    }, [comment.userReaction]);

    const [showReactions, setShowReactions] = useState(false);
    const pressTimeout = useRef<NodeJS.Timeout | null>(null);
    const hoverTimer = useRef<NodeJS.Timeout | null>(null);

    const replies = allComments.filter((c: any) => c.parentId === comment.id);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return; // Only left click or touch

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

    const handleSelectReaction = async (type: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setShowReactions(false);

        if (reactionType === type) {
            setReactionType(null);
            setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type as keyof typeof prev] - 1) }));
            await toggleCommentReactionAction(comment.id, type as any, false);
        } else {
            const oldType = reactionType;
            setReactionType(type);
            setCounts(prev => {
                const newCounts = { ...prev, [type]: prev[type as keyof typeof prev] + 1 };
                if (oldType) newCounts[oldType as keyof typeof prev] = Math.max(0, newCounts[oldType as keyof typeof prev] - 1);
                return newCounts;
            });
            await toggleCommentReactionAction(comment.id, type as any, true);
        }
    };

    const handlePrimaryClick = (e: React.MouseEvent) => {
        if (pressTimeout.current) {
            clearTimeout(pressTimeout.current);
            pressTimeout.current = null;
        }

        if (showReactions) return;

        if (reactionType) {
            handleSelectReaction(reactionType, e);
        } else {
            handleSelectReaction('like', e);
        }
    };

    const submitReply = async () => {
        if (!replyText.trim()) return;
        setIsReplying(false);
        await onReply(comment.id, replyText);
        setReplyText("");
        setShowReplies(true);
    };

    const handleReport = () => {
        alert('Comment reported!');
        setIsMenuOpen(false);
    };

    return (
        <div style={{ padding: level === 0 ? '0.5rem 0' : '0' }}>
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
                            <span className={styles.commentUser}>{comment.userName}</span>
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
                                            <button className={`${styles.commentDropdownItem} ${styles.danger}`} onClick={handleReport}>
                                                <Flag size={14} /> Report
                                            </button>
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
                                className={`${styles.commentActionBtn} ${reactionType ? styles.liked : ''}`}
                                style={{ color: reactionType && reactionType !== 'like' ? 'var(--accent-primary)' : '' }}
                                title="React (Hover or long press for more)"
                            >
                                <motion.div animate={reactionType ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                                    {reactionType === 'laugh' ? '😄' :
                                        reactionType === 'cool' ? '😎' :
                                            reactionType === 'thumbsUp' ? '💯' :
                                                <Heart size={16} fill={reactionType === 'like' ? '#ef4444' : 'transparent'} color={reactionType === 'like' ? '#ef4444' : 'currentColor'} />}
                                </motion.div>
                                <span style={{ marginLeft: '0.25rem' }}>
                                    {reactionType === 'laugh' ? counts.laugh :
                                        reactionType === 'cool' ? counts.cool :
                                            reactionType === 'thumbsUp' ? counts.thumbsUp :
                                                counts.like}
                                </span>
                            </button>

                            <AnimatePresence>
                                {showReactions && (
                                    <>
                                        <div
                                            style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'none' }} /* Desktop doesn't need invisible backdrop closing unless click outside */
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
                                        >
                                            <button className={styles.reactionEmojiBtn} onClick={(e) => handleSelectReaction('like', e)}>❤️</button>
                                            <button className={styles.reactionEmojiBtn} onClick={(e) => handleSelectReaction('laugh', e)}>😄</button>
                                            <button className={styles.reactionEmojiBtn} onClick={(e) => handleSelectReaction('cool', e)}>😎</button>
                                            <button className={styles.reactionEmojiBtn} onClick={(e) => handleSelectReaction('thumbsUp', e)}>💯</button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

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
                            style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', overflow: 'hidden' }}
                        >
                            <input
                                type="text"
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Write a reply..."
                                style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                                autoFocus
                            />
                            <button
                                onClick={submitReply}
                                style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, transition: 'background-color 0.2s' }}
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
                            <CommentItem key={reply.id} comment={reply} allComments={allComments} onReply={onReply} level={level + 1} />
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
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy", err);
        }
    };

    const handleDeleteCharacter = async () => {
        if (!confirm("Are you sure you want to delete this character? This action cannot be undone.")) return;
        setIsDeleting(true);
        const res = await deleteCharacterAction(character.id);
        if (res.success) {
            toast.success("Character deleted successfully!");
            router.push("/");
        } else {
            toast.error(res.error || "Failed to delete character.");
            setIsDeleting(false);
        }
    };

    const handleLikeToggle = async () => {
        if (isLiking || !character) return;
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

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !character || isCommenting) return;
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
                likesCount: 0
            }, ...prev]);
            setCommentText("");
        } else {
            setActionError(res.error || "Failed to post comment.");
        }
        setIsCommenting(false);
    };

    const handleReply = async (parentId: string, text: string) => {
        if (!character) return;
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
                likesCount: 0
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
        return <CharacterNotFound chrno={params.id as string} />;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerBar}>
                <button onClick={() => router.push("/")} className={styles.iconBtn}>
                    <ArrowLeft size={24} />
                </button>
                <div className={styles.headerActions}>
                    <button className={styles.iconBtn} onClick={handleShare} title="Share Character">
                        {shareCopied ? <Check size={20} color="#10b981" /> : <Share2 size={20} />}
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
                                onClick={handleDeleteCharacter}
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
                            By <Link href={`/profile/${character.creatorId}`} className={styles.creatorLink} style={{ textDecoration: 'none' }}>@{character.creatorId || "anonymous"}</Link>
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
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                disabled={isCommenting}
                                rows={3}
                                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }}
                            />
                            <button
                                type="submit"
                                disabled={isCommenting || !commentText.trim()}
                                style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', border: 'none', backgroundColor: 'var(--accent-primary)', color: 'white', cursor: (isCommenting || !commentText.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 600, alignSelf: 'flex-start' }}
                            >
                                {isCommenting ? (
                                    <><Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} /> Posting...</>
                                ) : (
                                    "Post Comment"
                                )}
                            </button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {comments.filter((c: any) => !c.parentId).map((comment: any) => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    allComments={comments}
                                    onReply={handleReply}
                                />
                            ))}
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
