"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowUp, Sparkles, MoreHorizontal, Settings, HardDrive, Database, Plus, MessageCircle, Loader, Square, RefreshCw, ChevronLeft, ChevronRight, Pencil, Check, X, Trash2 } from "lucide-react";
import styles from "@/app/(chat)/chat.module.css";
import { useRouter } from "next/navigation";
import { getCharacterByIdAction } from "@/app/(main)/actions";
import { getChatSessionAction, addChatMessageAction, createChatSessionAction, getApiConfigsAction, addMessageVersionAction, changeActiveVersionAction, updateMessageVersionAction } from "@/app/(chat)/actions";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import { toast } from "sonner";
import { ApiSettingsModal } from "@/components/ApiSettingsModal";
import { ParameterSettingsModal, ChatMemoryModal } from "@/components/ChatModals";
import CharacterNotFound from "@/components/CharacterNotFound";
import { parseReasoning } from "@/utils/parseReasoning";
import { ReasoningAccordion } from "@/components/ReasoningAccordion";

export interface VersionEntry {
    reasoning: string;
    content: string;
}

export interface LocalMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    parts?: { type: "text"; text: string }[];
    createdAt?: Date;
    versions?: VersionEntry[];
    activeVersionIndex?: number;
}

function getMessageText(msg: LocalMessage): string {
    if (!msg.parts) {
        if (typeof msg.content === 'string') return msg.content;
        return "";
    }
    return msg.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join("");
}

const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames || []), 'mark', 'span', 'think'],
    attributes: {
        ...defaultSchema.attributes,
        span: [...(defaultSchema.attributes?.span || []), 'style', 'className', 'class', 'data-spoiler'],
        div: [...(defaultSchema.attributes?.div || []), 'style', 'align'],
        mark: ['style', 'class', 'className'],
        think: ['style', 'class', 'className'],
    },
};



const AnimatedHamburger = ({ isOpen }: { isOpen: boolean }) => (
    <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <motion.path animate={isOpen ? "open" : "closed"} variants={{ closed: { d: "M4 6 L20 6" }, open: { d: "M6 6 L18 18" } }} transition={{ duration: 0.3, ease: "easeInOut" }} />
        <motion.path animate={isOpen ? "open" : "closed"} variants={{ closed: { d: "M4 12 L20 12", opacity: 1 }, open: { d: "M12 12 L12 12", opacity: 0 } }} transition={{ duration: 0.3, ease: "easeInOut" }} />
        <motion.path animate={isOpen ? "open" : "closed"} variants={{ closed: { d: "M4 18 L20 18" }, open: { d: "M6 18 L18 6" } }} transition={{ duration: 0.3, ease: "easeInOut" }} />
    </motion.svg>
);

function TypingMessage({ content, isTyping, characterName, sanitizeSchema: schema, resolver }: { content: string, isTyping: boolean, characterName: string, sanitizeSchema: any, resolver: (t: string) => string }) {
    const [displayedLen, setDisplayedLen] = useState(isTyping ? 0 : content.length);
    const rafRef = useRef<number | null>(null);
    const prevLenRef = useRef(content.length);

    useEffect(() => {
        if (!isTyping) {
            setDisplayedLen(content.length);
            return;
        }

        if (prevLenRef.current === 0 && content.length > 0) {
            setDisplayedLen(0);
        }
        prevLenRef.current = content.length;
    }, [isTyping, content.length]);

    useEffect(() => {
        if (displayedLen >= content.length && !isTyping) return;
        if (displayedLen >= content.length) return;

        const tick = () => {
            setDisplayedLen(prev => {
                const remaining = content.length - prev;
                const speed = Math.max(1, Math.ceil(remaining / 6));
                return Math.min(prev + speed, content.length);
            });
        };

        const timer = setTimeout(tick, 12);
        return () => clearTimeout(timer);
    }, [displayedLen, content.length, isTyping]);

    const stripName = useCallback((text: string) => {
        const escaped = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`^${escaped}:\\s*`, 'gm'), '');
    }, [characterName]);

    const raw = content.substring(0, displayedLen);
    const cleaned = stripName(resolver(raw));
    const showCursor = isTyping || displayedLen < content.length;
    const finalText = (cleaned + (showCursor ? ' ▍' : '')).replace(/"([^"]*)"/g, '<span style="color: var(--chat-dialog); font-weight: 500;">"$1"</span>');

    return (
        <ReactMarkdown
            remarkPlugins={[remarkBreaks]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]] as any}
            components={{
                strong: ({ node, ...props }) => <em style={{ color: 'var(--chat-italic)', opacity: 0.9, fontStyle: 'italic' }} {...props} />,
                em: ({ node, ...props }) => <em style={{ color: 'var(--chat-italic)', fontStyle: 'italic' }} {...props} />,
                p: ({ node, children }) => <p>{children}</p>
            }}
        >
            {finalText}
        </ReactMarkdown>
    );
}

function StaticMessage({ content, characterName, sanitizeSchema: schema, resolver }: { content: string, characterName: string, sanitizeSchema: any, resolver: (t: string) => string }) {
    const stripName = useCallback((text: string) => {
        const escaped = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`^${escaped}:\\s*`, 'gm'), '');
    }, [characterName]);

    const cleaned = stripName(resolver(content));
    const finalText = cleaned.replace(/"([^"]*)"/g, '<span style="color: var(--chat-dialog); font-weight: 500;">"$1"</span>');

    return (
        <ReactMarkdown
            remarkPlugins={[remarkBreaks]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]] as any}
            components={{
                strong: ({ node, ...props }) => <em style={{ color: 'var(--chat-italic)', opacity: 0.9, fontStyle: 'italic' }} {...props} />,
                em: ({ node, ...props }) => <em style={{ color: 'var(--chat-italic)', fontStyle: 'italic' }} {...props} />,
                p: ({ node, children }) => <p>{children}</p>
            }}
        >
            {finalText}
        </ReactMarkdown>
    );
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const chatId = resolvedParams.id; // rahasia nya cik ini

    const [character, setCharacter] = useState<any>(null);
    const [isLoadingInit, setIsLoadingInit] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [userName, setUserName] = useState("User");

    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
    const [showApiModal, setShowApiModal] = useState(false);
    const [showParamModal, setShowParamModal] = useState(false);
    const [showMemoryModal, setShowMemoryModal] = useState(false);

    const [apiConfigs, setApiConfigs] = useState<any[]>([]);

    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState("");

    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [deleteSelectedIndexes, setDeleteSelectedIndexes] = useState<Set<number>>(new Set());

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [input, setInput] = useState("");

    const activeConfig = apiConfigs.find(c => true);

    const [messages, setMessages] = useState<LocalMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const stop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    // Ini bekerja maka jangan di otak atik fetch chat session nya wkkwkw

    const fetchChatSession = useCallback(async () => {
        if (!chatId) return;
        try {
            const res = await getChatSessionAction(chatId);
            if (res.data && res.data.messages) {
                const loadedMessages = res.data.messages.map((msg: any) => {
                    const rawVersions = msg.versions && msg.versions.length > 0
                        ? msg.versions
                        : [msg.content || ''];
                    const versions: VersionEntry[] = rawVersions.map((v: any) => {
                        if (typeof v === 'string') {
                            const { reasoning, mainContent } = parseReasoning(v);
                            return { reasoning: reasoning || '', content: mainContent };
                        }
                        if (v && typeof v === 'object' && 'content' in v) {
                            return { reasoning: v.reasoning || '', content: v.content || '' };
                        }
                        return { reasoning: '', content: String(v || '') };
                    });
                    const idx = msg.activeVersionIndex || 0;
                    const activeVersion = versions[idx] || versions[0] || { reasoning: '', content: msg.content || '' };
                    return {
                        id: msg.id,
                        role: msg.role === 'ai' ? 'assistant' : msg.role as 'user' | 'assistant' | 'system',
                        content: activeVersion.content,
                        parts: [{ type: 'text' as const, text: activeVersion.content }],
                        versions,
                        activeVersionIndex: idx,
                        createdAt: msg.createdAt,
                    };
                });
                setMessages(loadedMessages);
            }
        } catch (error) {
            console.error("Failed to fetch messages:", error);
            toast.error("Failed to fetch messages");
        }
    }, [chatId, setMessages]);

    const resolveTemplateVars = (text: string) => {
        if (!text || !character) return text;
        return text
            .replace(/\{\{user\}\}/gi, userName)
            .replace(/\{\{char\}\}/gi, character.characterName || "")
    };

    const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        async function initChat() {
            if (!chatId) return;

            const res = await getChatSessionAction(chatId);

            if (res.success && res.data) {
                setCharacter(res.data.character);
                setUserName(res.data.userName || "User");
                await fetchChatSession();
            } else {
                const realCharacterId = localStorage.getItem(`chat_session_${chatId}`);
                if (realCharacterId) {
                    const charRes = await getCharacterByIdAction(realCharacterId) as any;
                    if (charRes.success && charRes.data) {
                        setCharacter(charRes.data);
                        const firstMsg = charRes.data.firstMessages?.[0] || "Hello! Let's start chatting.";
                        setMessages([{
                            id: "initial-1",
                            role: "assistant",
                            content: firstMsg,
                            parts: [{ type: 'text' as const, text: firstMsg }],
                            versions: [{ reasoning: '', content: firstMsg }],
                            activeVersionIndex: 0
                        } as any]);
                    }
                }
            }

            const configsRes = await getApiConfigsAction();
            if (configsRes.success && configsRes.data) {
                setApiConfigs(configsRes.data);
            }

            setIsLoadingInit(false);
        }
        initChat();
    }, [chatId, fetchChatSession]);

    const handleSendWrap = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        if (!activeConfig) {
            toast.error("Please configure an API Settings profile first.");
            setShowApiModal(true);
            return;
        }

        const currentInput = input;

        const textarea = document.getElementById('chat-input') as HTMLTextAreaElement;
        if (textarea) textarea.style.height = "auto";
        setInput("");

        const newUserMessage: LocalMessage = {
            id: Date.now().toString(),
            role: "user",
            content: currentInput,
            parts: [{ type: 'text', text: currentInput }],
            versions: [{ reasoning: '', content: currentInput }],
            activeVersionIndex: 0
        };

        setMessages(prev => [...prev, newUserMessage]);
        const addRes = await addChatMessageAction(chatId, "user", currentInput);
        if (addRes.success && addRes.messageId) {
            newUserMessage.id = addRes.messageId;
            setMessages(prev => prev.map(m => m.id === newUserMessage.id || m.id === Date.now().toString() ? { ...m, id: addRes.messageId } : m));
        }

        await sendToAI([...messages, newUserMessage], false);
    };

    const sendToAI = async (contextMessages: LocalMessage[], isRegen: boolean) => {
        setIsLoading(true);
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const tempId = Date.now().toString() + "-ai";
        const newMsg: LocalMessage = {
            id: tempId,
            role: "assistant",
            content: "",
            parts: [{ type: "text", text: "" }],
            versions: [{ reasoning: '', content: '' }],
            activeVersionIndex: 0
        };

        setMessages(prev => [...prev, newMsg]);

        let combinedContent = "";
        let reasoningContent = "";
        let finalContent = "";

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatId,
                    isRegen,
                    messages: contextMessages.map(m => ({
                        role: m.role,
                        content: m.parts ? m.parts.map((p: any) => p.text).join("") : m.content
                    }))
                }),
                signal: abortController.signal
            });

            if (!res.ok) {
                const err = await res.json();
                toast.error(err.error || "Failed to get AI response");
                setIsLoading(false);
                return;
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No reader");

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.type === 'reasoning') {
                                reasoningContent += parsed.text;
                            } else if (parsed.type === 'content') {
                                combinedContent += parsed.text;
                            }
                            finalContent = combinedContent;

                            setMessages(prev => {
                                const targetMsg = prev.find(m => m.id === tempId);
                                if (!targetMsg) return prev;

                                const contentChanged = targetMsg.content !== combinedContent;
                                const reasoningChanged = targetMsg.versions?.[0]?.reasoning !== reasoningContent;

                                if (!contentChanged && !reasoningChanged) return prev;

                                return prev.map(m => {
                                    if (m.id === tempId) {
                                        return {
                                            ...m,
                                            content: combinedContent,
                                            parts: [{ type: "text", text: combinedContent }],
                                            versions: [{ reasoning: reasoningContent, content: combinedContent }],
                                            activeVersionIndex: 0
                                        };
                                    }
                                    return m;
                                });
                            });

                        } catch (e) {
                            console.warn("Parse error", e);
                        }
                    }
                }
            }

            if (finalContent) {
                const rawFull = reasoningContent ? `<think>\n${reasoningContent}\n</think>\n\n${combinedContent}` : combinedContent;
                const dbRes = await addChatMessageAction(chatId, "assistant", rawFull);
                if (dbRes.success && dbRes.messageId) {
                    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: dbRes.messageId } : m));
                }
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log("Stream aborted");
                if (finalContent) {
                    const rawFull = reasoningContent ? `<think>\n${reasoningContent}\n</think>\n\n${combinedContent}` : combinedContent;
                    const dbRes = await addChatMessageAction(chatId, "assistant", rawFull);
                    if (dbRes.success && dbRes.messageId) {
                        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: dbRes.messageId } : m));
                    }
                }
            } else {
                console.error("AI stream error:", error);
                toast.error(error.message || "Stream error occurred");

                if (!finalContent) {
                    setMessages(prev => prev.filter(m => m.id !== tempId));
                }
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;

            const currentMessageCount = contextMessages.length + 1; // context + this new assistant message
            if (currentMessageCount > 0 && currentMessageCount % 30 === 0) {
                import("@/app/(chat)/actions").then(({ generateChatMemorySummaryAction }) => {
                    generateChatMemorySummaryAction(chatId).catch(err => {
                        console.error("Background auto-summarization failed:", err);
                    });
                });
            }
        }
    };

    const handleRegenerate = async (msgIdToRegen?: string) => {
        if (messages.length === 0 || isLoading) return;

        let lastMsgIdx = messages.length - 1;
        if (msgIdToRegen) {
            lastMsgIdx = messages.findIndex(m => m.id === msgIdToRegen);
        } else {
            while (lastMsgIdx >= 0 && messages[lastMsgIdx].role !== "assistant") {
                lastMsgIdx--;
            }
        }

        if (lastMsgIdx < 0) {
            toast.error("No previous assistant message to regenerate.");
            return;
        }

        const msgToRegenerate = messages[lastMsgIdx];
        const msgId = msgToRegenerate.id;

        setRegeneratingId(msgId);
        setIsLoading(true);

        const newVersionIndex = (msgToRegenerate.versions?.length || 1);

        setMessages(prev => prev.map(m => {
            if (m.id === msgId) {
                const currentVersions: VersionEntry[] = m.versions || [{ reasoning: '', content: m.content }];
                return {
                    ...m,
                    content: '',
                    parts: [{ type: 'text', text: '' }],
                    versions: [...currentVersions, { reasoning: '', content: '' }],
                    activeVersionIndex: newVersionIndex
                };
            }
            return m;
        }));

        const historyForReq = messages.slice(0, lastMsgIdx);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        let combinedContent = "";
        let reasoningContent = "";
        let finalContent = "";

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatId,
                    isRegen: true,
                    messages: historyForReq.map(m => ({
                        role: m.role,
                        content: m.parts ? m.parts.map((p: any) => p.text).join("") : m.content
                    }))
                }),
                signal: abortController.signal
            });

            if (!res.ok) {
                const err = await res.json();
                toast.error(err.error || "Failed to get AI response");
                setIsLoading(false);
                setRegeneratingId(null);
                return;
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No reader");

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.type === 'reasoning') {
                                reasoningContent += parsed.text;
                            } else if (parsed.type === 'content') {
                                combinedContent += parsed.text;
                            }
                            finalContent = combinedContent;

                            setMessages(prev => prev.map(m => {
                                if (m.id === msgId) {
                                    const currentVersions: VersionEntry[] = [...(m.versions || [{ reasoning: '', content: m.content }])];
                                    currentVersions[newVersionIndex] = { reasoning: reasoningContent, content: combinedContent };
                                    return {
                                        ...m,
                                        content: combinedContent,
                                        parts: [{ type: 'text', text: combinedContent }],
                                        versions: currentVersions,
                                        activeVersionIndex: newVersionIndex
                                    };
                                }
                                return m;
                            }));

                        } catch (e) {
                            console.warn('Parse error', e);
                        }
                    }
                }
            }

            if (finalContent) {
                await addMessageVersionAction(msgId, { reasoning: reasoningContent, content: combinedContent });
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted');
                if (finalContent) {
                    await addMessageVersionAction(msgId, { reasoning: reasoningContent, content: combinedContent });
                }
            } else {
                console.error("AI stream error:", error);
                toast.error(error.message || "Stream error occurred");
            }
        } finally {
            setIsLoading(false);
            setRegeneratingId(null);
            abortControllerRef.current = null;
        }
    };

    const handlePrevVariant = useCallback(async (msgId: string) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg || !msg.versions) return;

        const currentIdx = msg.activeVersionIndex || 0;
        const newIdx = Math.max(0, currentIdx - 1);
        if (newIdx === currentIdx) return;

        const version = msg.versions[newIdx];
        const newContent = typeof version === 'string' ? version : version.content;
        setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, content: newContent, parts: [{ type: 'text', text: newContent }], activeVersionIndex: newIdx } : m
        ));

        await changeActiveVersionAction(msgId, newIdx);
    }, [messages, setMessages]);

    const handleNextVariant = useCallback(async (msgId: string) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg || !msg.versions) return;

        const currentIdx = msg.activeVersionIndex || 0;
        const newIdx = Math.min(msg.versions.length - 1, currentIdx + 1);
        if (newIdx === currentIdx) return;

        const version = msg.versions[newIdx];
        const newContent = typeof version === 'string' ? version : version.content;
        setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, content: newContent, parts: [{ type: 'text', text: newContent }], activeVersionIndex: newIdx } : m
        ));

        await changeActiveVersionAction(msgId, newIdx);
    }, [messages, setMessages]);

    const handleEdit = (msg: LocalMessage) => {
        setEditingMessageId(msg.id);
        const activeVersionIdx = msg.activeVersionIndex ?? 0;
        const currentVersion = msg.versions?.[activeVersionIdx] || msg.content;
        const currentContent = typeof currentVersion === 'string' ? currentVersion : (currentVersion as VersionEntry).content;
        setEditDraft(currentContent || msg.content);
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditDraft('');
    };

    const handleSaveEdit = async (msgId: string) => {
        if (!editDraft.trim()) return;
        const msgIndex = messages.findIndex(m => m.id === msgId);
        if (msgIndex === -1) return;

        const msg = messages[msgIndex];
        setEditingMessageId(null);

        if (msg.role === 'user') {
            const newHistory = [...messages.slice(0, msgIndex)];
            const updatedUserMsg: LocalMessage = {
                ...msg,
                content: editDraft,
                parts: [{ type: 'text', text: editDraft }],
                versions: [{ reasoning: '', content: editDraft }],
                activeVersionIndex: 0
            };
            newHistory.push(updatedUserMsg);

            const idsToDelete = messages.slice(msgIndex + 1).map(m => m.id);
            if (idsToDelete.length > 0) {
                import("@/app/(chat)/actions").then(({ deleteMessagesAction }) => {
                    deleteMessagesAction(chatId, idsToDelete);
                });
            }

            setMessages(newHistory);

            await updateMessageVersionAction(msgId, 0, { reasoning: '', content: editDraft });

            await sendToAI(newHistory, false);

        } else {
            const activeVersionIdx = msg.activeVersionIndex ?? 0;
            const currentVersions = [...(msg.versions || [{ reasoning: '', content: msg.content }])];

            const existingReasoning = typeof currentVersions[activeVersionIdx] === 'string'
                ? parseReasoning(currentVersions[activeVersionIdx] as string).reasoning
                : (currentVersions[activeVersionIdx] as VersionEntry).reasoning;

            const newVersionEntry: VersionEntry = {
                reasoning: existingReasoning || '',
                content: editDraft
            };

            currentVersions[activeVersionIdx] = newVersionEntry;

            setMessages(prev => prev.map(m =>
                m.id === msgId ? {
                    ...m,
                    content: editDraft,
                    parts: [{ type: 'text', text: editDraft }],
                    versions: currentVersions
                } : m
            ));

            await updateMessageVersionAction(msgId, activeVersionIdx, newVersionEntry);
        }
    };

    const toggleDeleteMode = () => {
        setIsDeleteMode(!isDeleteMode);
        setDeleteSelectedIndexes(new Set());
    };

    const handleSelectForDelete = (index: number) => {
        if (!isDeleteMode) return;

        setDeleteSelectedIndexes(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                for (let i = index; i < messages.length; i++) {
                    next.delete(i);
                }
            } else {
                for (let i = index; i < messages.length; i++) {
                    next.add(i);
                }
            }
            return next;
        });
    };

    const handleExecuteDelete = async () => {
        if (deleteSelectedIndexes.size === 0) {
            toggleDeleteMode();
            return;
        }

        const idsToDelete: string[] = [];
        const indexesArray = Array.from(deleteSelectedIndexes).sort((a, b) => a - b);

        for (const idx of indexesArray) {
            if (messages[idx] && messages[idx].id) {
                idsToDelete.push(messages[idx].id);
            }
        }

        setMessages(prev => prev.filter((_, i) => !deleteSelectedIndexes.has(i)));
        setIsDeleteMode(false);
        setDeleteSelectedIndexes(new Set());

        import("@/app/(chat)/actions").then(({ deleteMessagesAction }) => {
            deleteMessagesAction(chatId, idsToDelete).then(res => {
                if (!res.success) {
                    toast.error("Failed to delete messages");
                }
            });
        });
    };

    const handleEnhance = async () => {
        if (input.length < 20) {
            toast.info("Need at least 20 characters to enhance.");
            return;
        }

        const toastId = toast.loading("Enhancing your message...");

        try {
            const response = await fetch("/api/enhance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: input, chatId }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(err.error || "Failed to enhance text");
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No stream reader");

            let enhanced = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.trim() === "" || !line.startsWith("data: ")) continue;
                    const dataStr = line.slice(6);
                    if (dataStr === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.type === "enhance" && parsed.text) {
                            enhanced += parsed.text;
                            setInput(enhanced);
                            const textarea = document.getElementById('chat-input') as HTMLTextAreaElement;
                            if (textarea) {
                                textarea.style.height = "auto";
                                textarea.style.height = `${textarea.scrollHeight}px`;
                            }
                        }
                    } catch { }
                }
            }

            if (enhanced) {
                toast.success("Message enhanced!", { id: toastId });
            } else {
                toast.error("No enhanced text received.", { id: toastId });
            }
        } catch (error: any) {
            console.error("Enhance error:", error);
            toast.error(error.message || "Failed to enhance message", { id: toastId });
        }
    };

    // new chat ID biwat hambuger
    const handleNewChat = async () => {
        setShowHamburgerMenu(false);
        if (!character) return;
        const newChatId = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
        const res = await createChatSessionAction(character.id, newChatId);
        if (res.success) {
            toast.success("New chat created");
            router.push(`/chat/${newChatId}`);
        } else {
            toast.error("Failed to create new chat session");
        }
    };

    // ini buat loader biar cepet

    if (isLoadingInit) {
        return (
            <main className={styles.chatArea}>
                <div className={styles.skeletonNavbar}>
                    <div className={`${styles.skeletonBase} ${styles.skeletonNavIcon}`} />
                    <div className={`${styles.skeletonBase} ${styles.skeletonNavTitle}`} />
                    <div className={`${styles.skeletonBase} ${styles.skeletonNavIcon}`} />
                </div>

                <div className={styles.skeletonMessages}>
                    <div className={`${styles.skeletonMsgRow} ${styles.skeletonMsgRowAi}`}>
                        <div className={`${styles.skeletonBase} ${styles.skeletonAvatar}`} />
                        <div className={styles.skeletonMsgBody}>
                            <div className={styles.skeletonMsgHeader}>
                                <div className={`${styles.skeletonBase} ${styles.skeletonAuthor}`} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonTime}`} />
                            </div>
                            <div className={styles.skeletonBubble}>
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '90%' }} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '75%' }} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '60%' }} />
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.skeletonMsgRow} ${styles.skeletonMsgRowUser}`}>
                        <div className={styles.skeletonMsgBody}>
                            <div className={styles.skeletonMsgHeader}>
                                <div className={`${styles.skeletonBase} ${styles.skeletonAuthor}`} style={{ width: '40px' }} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonTime}`} />
                            </div>
                            <div className={styles.skeletonBubble}>
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '85%' }} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '50%' }} />
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.skeletonMsgRow} ${styles.skeletonMsgRowAi}`}>
                        <div className={`${styles.skeletonBase} ${styles.skeletonAvatar}`} />
                        <div className={styles.skeletonMsgBody}>
                            <div className={styles.skeletonMsgHeader}>
                                <div className={`${styles.skeletonBase} ${styles.skeletonAuthor}`} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonTime}`} />
                            </div>
                            <div className={styles.skeletonBubble}>
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '95%' }} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '80%' }} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '70%' }} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '45%' }} />
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.skeletonMsgRow} ${styles.skeletonMsgRowUser}`}>
                        <div className={styles.skeletonMsgBody}>
                            <div className={styles.skeletonMsgHeader}>
                                <div className={`${styles.skeletonBase} ${styles.skeletonAuthor}`} style={{ width: '40px' }} />
                                <div className={`${styles.skeletonBase} ${styles.skeletonTime}`} />
                            </div>
                            <div className={styles.skeletonBubble}>
                                <div className={`${styles.skeletonBase} ${styles.skeletonLine}`} style={{ width: '70%' }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.skeletonInputArea}>
                    <div className={styles.skeletonInput}>
                        <div className={`${styles.skeletonBase} ${styles.skeletonInputLine}`} />
                        <div className={styles.skeletonInputActions}>
                            <div className={`${styles.skeletonBase} ${styles.skeletonInputBtn}`} />
                            <div className={`${styles.skeletonBase} ${styles.skeletonInputBtn}`} />
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (!character) {
        return <CharacterNotFound chrno={"Unknown"} />;
    }

    return (
        <main className={styles.chatArea}>
            <header className={styles.topNavbar}>
                <button onClick={() => router.push('/chats')} className={styles.navIconButton}>
                    <ArrowLeft size={24} />
                </button>
                <div className={styles.navTitle}>
                    {character.characterName}
                </div>
                <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowHamburgerMenu(!showHamburgerMenu)} className={styles.navIconButton}>
                        <AnimatedHamburger isOpen={showHamburgerMenu} />
                    </button>
                    <AnimatePresence>
                        {showHamburgerMenu && (
                            <motion.div
                                key="nav-dropdown"
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className={styles.navDropdownMenu}
                                style={{ transformOrigin: "top right" }}
                            >
                                <button className={styles.dropdownItem} onClick={() => { setShowApiModal(true); setShowHamburgerMenu(false); }}>
                                    <Settings size={16} /> API Settings
                                </button>
                                <button className={styles.dropdownItem} onClick={() => { setShowParamModal(true); setShowHamburgerMenu(false); }}>
                                    <HardDrive size={16} /> Parameters Settings
                                </button>
                                <button className={styles.dropdownItem} onClick={() => { setShowMemoryModal(true); setShowHamburgerMenu(false); }}>
                                    <Database size={16} /> Chat Memory
                                </button>
                                <div style={{ height: '1px', background: 'var(--border-light)', margin: '4px 0' }} />

                                <button className={styles.dropdownItem} onClick={handleNewChat}>
                                    <Plus size={16} /> New Chat
                                </button>
                                <button className={styles.dropdownItem} onClick={() => router.push('/chats')}>
                                    <MessageCircle size={16} /> All Chat
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            <div className={styles.messagesArea}>
                {messages.filter(m => m.role !== "system").length === 0 && !isLoading ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={styles.welcomeScreen}
                    >
                        <div className={styles.welcomeIconWrapper}>
                            {character.imageUrl ? (
                                <img src={character.imageUrl} alt={character.characterName} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                            ) : (
                                <Image src="/logo.svg" alt="MooW Logo" width={50} height={50} />
                            )}
                        </div>
                        <h2 className={styles.welcomeTitle}>{character.characterName}</h2>
                        <p className={styles.welcomeText}>
                            Let's Chat the character
                        </p>
                    </motion.div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.filter((m) => m.role !== "system").map((msg, index, array) => {
                            const isAi = msg.role === 'assistant' || msg.role === 'system';
                            const authorName = isAi ? character.characterName : "You";
                            const msgText = getMessageText(msg);
                            const msgTime = new Date((msg as any).createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const isLastAiMessage = isAi && index === array.length - 1;
                            const showTypingCursor = isLastAiMessage && isLoading;

                            const activeVersion = msg.versions?.[msg.activeVersionIndex ?? 0];
                            let reasoning: string | null = null;
                            let mainContent = msgText;
                            if (activeVersion && typeof activeVersion !== 'string') {
                                reasoning = activeVersion.reasoning || null;
                                mainContent = activeVersion.content || msgText;
                            } else if (activeVersion && typeof activeVersion === 'string') {
                                const parsed = parseReasoning(activeVersion);
                                reasoning = parsed.reasoning;
                                mainContent = parsed.mainContent;
                            } else {
                                const parsed = parseReasoning(msgText);
                                reasoning = parsed.reasoning;
                                mainContent = parsed.mainContent;
                            }

                            return (
                                <motion.div
                                    key={msg.id || `msg-${index}`}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className={`${styles.messageWrapper} ${!isAi ? styles.messageUser : styles.messageAi} ${isDeleteMode ? styles.messageSelectable : ''} ${deleteSelectedIndexes.has(index) ? styles.messageDeleteSelected : ''}`}
                                    onClick={() => handleSelectForDelete(index)}
                                >
                                    {isAi && (
                                        <div className={styles.messageAvatar} style={character.imageUrl ? { backgroundImage: `url(${character.imageUrl})` } : { background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }} />
                                    )}
                                    <div className={styles.messageContent}>
                                        <div className={styles.messageHeader}>
                                            <span className={styles.messageAuthor}>{authorName}</span>
                                            <span className={styles.messageTime}>{msgTime}</span>
                                        </div>
                                        {reasoning && (
                                            <ReasoningAccordion reasoning={reasoning} sanitizeSchema={sanitizeSchema} resolver={resolveTemplateVars} isStreaming={showTypingCursor && !mainContent} />
                                        )}
                                        {!(showTypingCursor && !mainContent && reasoning) && (
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={`${msg.id}-variant-${msg.activeVersionIndex ?? 0}`}
                                                    className={styles.messageBubble}
                                                    initial={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
                                                    animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                                                    exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
                                                    transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                                                >
                                                    {editingMessageId === msg.id ? (
                                                        <div className={styles.editContainer}>
                                                            <textarea
                                                                className={styles.editTextarea}
                                                                value={editDraft}
                                                                onChange={(e) => {
                                                                    setEditDraft(e.target.value);
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                                                }}
                                                                autoFocus
                                                            />
                                                            <div className={styles.editActions}>
                                                                <button className={styles.editCancelBtn} onClick={handleCancelEdit}><X size={14} /> Cancel</button>
                                                                <button className={styles.editSaveBtn} onClick={() => handleSaveEdit(msg.id)}><Check size={14} /> Save</button>
                                                            </div>
                                                        </div>
                                                    ) : isAi && showTypingCursor ? (
                                                        <TypingMessage content={mainContent} isTyping={true} characterName={character.characterName} sanitizeSchema={sanitizeSchema} resolver={resolveTemplateVars} />
                                                    ) : isAi ? (
                                                        <StaticMessage content={mainContent} characterName={character.characterName} sanitizeSchema={sanitizeSchema} resolver={resolveTemplateVars} />
                                                    ) : (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkBreaks]}
                                                            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]] as any}
                                                            components={{
                                                                strong: ({ node, ...props }) => <em style={{ color: 'var(--chat-italic)', opacity: 0.9, fontStyle: 'italic' }} {...props} />,
                                                                em: ({ node, ...props }) => <em style={{ color: 'var(--chat-italic)', fontStyle: 'italic' }} {...props} />,
                                                                p: ({ node, children }) => <p>{children}</p>
                                                            }}
                                                        >
                                                            {resolveTemplateVars(mainContent).replace(/"([^"]*)"/g, '<span style="color: var(--chat-dialog); font-weight: 500;">"$1"</span>')}
                                                        </ReactMarkdown>
                                                    )}
                                                </motion.div>
                                            </AnimatePresence>
                                        )}
                                        {isLastAiMessage && !isLoading && ( //ini regenerate logic
                                            <div className={styles.messageActions}>
                                                {(() => {
                                                    const firstAiIndex = array.findIndex(m => m.role === 'assistant');
                                                    const isFirstAiMessage = index === firstAiIndex;

                                                    return (
                                                        <>
                                                            {!isFirstAiMessage && (
                                                                <motion.button
                                                                    onClick={() => handleRegenerate(msg.id)}
                                                                    className={styles.regenerateButton}
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                >
                                                                    <motion.div
                                                                        whileTap={{ rotate: 360 }}
                                                                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                                                                        style={{ display: 'flex', alignItems: 'center' }}
                                                                    >
                                                                        <RefreshCw size={12} />
                                                                    </motion.div>
                                                                    Regenerate
                                                                </motion.button>
                                                            )}
                                                            {msg.versions && msg.versions.length > 1 && (
                                                                <div className={styles.variantNav}>
                                                                    <motion.button
                                                                        className={styles.variantNavButton}
                                                                        onClick={() => handlePrevVariant(msg.id)}
                                                                        disabled={(msg.activeVersionIndex ?? 0) === 0}
                                                                        whileHover={{ scale: 1.15, backgroundColor: 'var(--bg-tertiary)' }}
                                                                        whileTap={{ scale: 0.85, x: -3 }}
                                                                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                                                                    >
                                                                        <ChevronLeft size={14} />
                                                                    </motion.button>
                                                                    <span className={styles.variantCounter}>
                                                                        {(msg.activeVersionIndex ?? 0) + 1}/{msg.versions.length}
                                                                    </span>
                                                                    <motion.button
                                                                        className={styles.variantNavButton}
                                                                        onClick={() => handleNextVariant(msg.id)}
                                                                        disabled={(msg.activeVersionIndex ?? 0) >= msg.versions.length - 1}
                                                                        whileHover={{ scale: 1.15, backgroundColor: 'var(--bg-tertiary)' }}
                                                                        whileTap={{ scale: 0.85, x: 3 }}
                                                                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                                                                    >
                                                                        <ChevronRight size={14} />
                                                                    </motion.button>
                                                                </div>
                                                            )}
                                                            {!isFirstAiMessage && editingMessageId !== msg.id && (
                                                                <motion.button
                                                                    onClick={() => handleEdit(msg)}
                                                                    className={styles.editButton}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    title="Edit AI Response"
                                                                >
                                                                    <Pencil size={12} />
                                                                </motion.button>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        {!isAi && !isLoading && editingMessageId !== msg.id && (
                                            <div className={styles.messageActionsUser}>
                                                <motion.button
                                                    onClick={() => handleEdit(msg)}
                                                    className={styles.editButton}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    title="Edit Message"
                                                >
                                                    <Pencil size={12} />
                                                </motion.button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                        <div key="messages-end" ref={messagesEndRef} />
                    </AnimatePresence>
                )}
            </div>

            <div className={styles.inputWrapper}>
                <div className={styles.inputContainer}>
                    {isDeleteMode ? (
                        <div className={styles.deleteConfirmBar}>
                            <span className={styles.deleteConfirmText}>
                                {deleteSelectedIndexes.size} message(s) selected
                            </span>
                            <div className={styles.deleteConfirmActions}>
                                <button className={styles.deleteCancelBtn} onClick={toggleDeleteMode}>Cancel</button>
                                <button className={styles.deleteConfirmBtn} onClick={handleExecuteDelete}>
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form className={styles.textareaWrapper} onSubmit={handleSendWrap} style={{ width: '100%', margin: 0 }}>
                            <textarea
                                id="chat-input"
                                placeholder="Type a message..."
                                className={styles.textarea}
                                rows={1}
                                value={input}
                                onChange={handleInputResize}
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
                                        e.preventDefault();
                                        handleSendWrap();
                                    } else if (e.key === 'Enter' && e.altKey) {
                                        e.preventDefault();
                                        handleEnhance();
                                    }
                                }}
                            />
                        </form>
                    )}

                    {!isDeleteMode && (
                        <div className={styles.inputOptions}>
                            <span className={styles.hintText}>
                                Enter to send chat. <span className={styles.hintShortcut}>Shift + Enter</span> for linebreak.<br />
                                <span className={styles.hintShortcut}>Alt + Enter</span> for suggestion (20 chars minimum)
                            </span>

                            <div className={styles.inputActions}>
                                <div style={{ position: 'relative' }}>
                                    <button className={styles.iconButton} onClick={() => setShowDropdown(!showDropdown)} title="Message Options">
                                        <MoreHorizontal size={20} />
                                    </button>
                                    <AnimatePresence>
                                        {showDropdown && (
                                            <motion.div
                                                key="action-dropdown"
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.15 }}
                                                className={styles.dropdownMenu}
                                            >
                                                <button
                                                    className={styles.dropdownItem}
                                                    onClick={() => {
                                                        handleEnhance();
                                                        setShowDropdown(false);
                                                    }}
                                                >
                                                    <Sparkles size={16} /> Enhance text
                                                </button>
                                                <div style={{ height: '1px', background: 'var(--border-light)', margin: '4px 0' }} />
                                                <button
                                                    className={styles.dropdownItem}
                                                    onClick={() => {
                                                        toggleDeleteMode();
                                                        setShowDropdown(false);
                                                    }}
                                                    style={{ color: 'var(--accent-danger, #ef4444)' }}
                                                >
                                                    <Trash2 size={16} /> Delete Messages
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <motion.button
                                            key="stop-btn"
                                            className={`${styles.sendButton} ${styles.active}`}
                                            onClick={stop}
                                            title="Stop Generating"
                                            initial={{ scale: 0, rotate: -180, opacity: 0 }}
                                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                            exit={{ scale: 0, rotate: 180, opacity: 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                            whileTap={{ scale: 0.85 }}
                                        >
                                            <Square size={16} fill="currentColor" />
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            key="send-btn"
                                            className={`${styles.sendButton} ${input.trim() ? styles.active : ''}`}
                                            onClick={handleSendWrap}
                                            disabled={!input.trim()}
                                            initial={{ scale: 0, rotate: 180, opacity: 0 }}
                                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                            exit={{ scale: 0, rotate: -90, opacity: 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                            whileHover={input.trim() ? { scale: 1.12, boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)' } : {}}
                                            whileTap={input.trim() ? { scale: 0.85, y: -2 } : {}}
                                        >
                                            <motion.div
                                                animate={input.trim() ? { y: [0, -2, 0] } : { y: 0 }}
                                                transition={input.trim() ? { duration: 0.6, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' } : {}}
                                            >
                                                <ArrowUp size={16} />
                                            </motion.div>
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ApiSettingsModal isOpen={showApiModal} onClose={() => setShowApiModal(false)} onRefresh={() => getApiConfigsAction().then(res => res.data && setApiConfigs(res.data))} apiConfigs={apiConfigs} />
            <ParameterSettingsModal isOpen={showParamModal} onClose={() => setShowParamModal(false)} />
            <ChatMemoryModal isOpen={showMemoryModal} onClose={() => setShowMemoryModal(false)} />
        </main>
    );
}
