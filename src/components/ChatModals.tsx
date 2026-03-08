"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import styles from "@/app/(main)/settings/settings.module.css";
import chatStyles from "@/app/(chat)/chat.module.css";
import { useState, useEffect } from "react";
import { getApiConfigsAction, updateApiParametersAction, updateChatMemoryAction, getChatSessionAction, generateChatMemorySummaryAction } from "@/app/(chat)/actions";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { GsapSlider, GsapDropdown } from "@/components/GsapUI";

interface ParameterSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ParameterSettingsModal({ isOpen, onClose }: ParameterSettingsModalProps) {
    const [temperature, setTemperature] = useState(0.8);
    const [maxTokens, setMaxTokens] = useState(2048);
    const [contextSize, setContextSize] = useState(4096);
    const [topP, setTopP] = useState(1);
    const [topK, setTopK] = useState(0);
    const [repPenalty, setRepPenalty] = useState(1.0);
    const [freqPenalty, setFreqPenalty] = useState(0.0);
    const [forbiddenTags, setForbiddenTags] = useState<string[]>(["{{user}}"]);
    const [tagInput, setTagInput] = useState("");
    const [responsePrefill, setResponsePrefill] = useState("");
    const [usePrefill, setUsePrefill] = useState(false);

    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [isRulesOpen, setIsRulesOpen] = useState(false);

    const [configId, setConfigId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            getApiConfigsAction().then(res => {
                if (res.success && res.data && res.data.length > 0) {
                    const activeConfig = res.data[0];
                    setConfigId(activeConfig.id);
                    setTemperature(activeConfig.temperature ?? 0.8);
                    setMaxTokens(activeConfig.maxTokens ?? 2048);
                    setContextSize(activeConfig.contextSize ?? 4096);
                    setTopP(activeConfig.topP ?? 1.0);
                    setTopK(activeConfig.topK ?? 0);
                    setRepPenalty(activeConfig.repPenalty ?? 1.0);
                    setFreqPenalty(activeConfig.freqPenalty ?? 0.0);
                    const savedWords = activeConfig.forbiddenWords || "{{user}}";
                    setForbiddenTags(savedWords.split(",").map((w: string) => w.trim()).filter(Boolean));
                    setResponsePrefill(activeConfig.responsePrefill || "");
                    setUsePrefill(activeConfig.usePrefill ?? false);
                }
            });
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!configId) {
            toast.error("No API Config found. Please set one up first.");
            return;
        }
        setIsSaving(true);
        const forbiddenWords = forbiddenTags.join(", ");
        const res = await updateApiParametersAction(configId, {
            temperature, maxTokens, contextSize, topP, topK, repPenalty, freqPenalty, forbiddenWords, responsePrefill, usePrefill
        });
        setIsSaving(false);
        if (res.success) {
            toast.success("Parameters saved successfully.");
            onClose();
        } else {
            toast.error(res.error || "Failed to save parameters.");
        }
    };

    const addTag = (val: string) => {
        const trimmed = val.trim();
        if (trimmed && !forbiddenTags.includes(trimmed)) {
            setForbiddenTags(prev => [...prev, trimmed]);
        }
        setTagInput("");
    };

    const removeTag = (idx: number) => {
        setForbiddenTags(prev => prev.filter((_, i) => i !== idx));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "," || e.key === "Enter") {
            e.preventDefault();
            addTag(tagInput);
        }
        if (e.key === "Backspace" && tagInput === "" && forbiddenTags.length > 0) {
            setForbiddenTags(prev => prev.slice(0, -1));
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1000 }}>
            <motion.div
                className={styles.modalContent}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ maxWidth: '500px', width: '100%' }}
            >
                <div className={styles.modalHeader}>
                    <h3>Parameter Settings</h3>
                    <button onClick={onClose} className={styles.iconBtn}><X size={20} /></button>
                </div>

                <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className={styles.inputGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label className={styles.label}>Temperature</label>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{temperature}</span>
                        </div>
                        <GsapSlider min={0} max={2} step={0.05} value={temperature} onChange={setTemperature} />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.5rem 0 0 0' }}>Controls randomness: lower is more deterministic, higher is more creative.</p>
                    </div>

                    <div className={styles.inputGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label className={styles.label}>Max Tokens</label>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{maxTokens}</span>
                        </div>
                        <GsapSlider min={100} max={8000} step={100} value={maxTokens} onChange={setMaxTokens} />
                    </div>

                    <div className={styles.inputGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label className={styles.label}>Context Size</label>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{contextSize}</span>
                        </div>
                        <GsapSlider min={512} max={128000} step={512} value={contextSize} onChange={setContextSize} />
                    </div>

                    <GsapDropdown
                        title="Parameters Generation Rules"
                        isOpen={isRulesOpen}
                        onToggle={() => setIsRulesOpen(!isRulesOpen)}
                    >
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Forbidden Words & Phrases</label>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.4rem',
                                padding: '0.5rem',
                                border: '1px solid var(--border-medium)',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                minHeight: '42px',
                                alignItems: 'center',
                                cursor: 'text'
                            }} onClick={() => document.getElementById('forbidden-tag-input')?.focus()}>
                                {forbiddenTags.map((tag, i) => (
                                    <span key={i} style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.2rem 0.5rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                        color: '#ef4444',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: '#ef4444',
                                                opacity: 0.7
                                            }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    id="forbidden-tag-input"
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                                    placeholder={forbiddenTags.length === 0 ? "Type and press comma or enter..." : ""}
                                    style={{
                                        border: 'none',
                                        outline: 'none',
                                        background: 'transparent',
                                        fontSize: '0.85rem',
                                        flex: 1,
                                        minWidth: '80px',
                                        color: 'var(--text-primary)',
                                        padding: '0.15rem 0'
                                    }}
                                />
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.3rem 0 0 0' }}>Press comma or enter to add. These words will be avoided by the AI.</p>
                        </div>

                        <div className={styles.inputGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className={styles.label}>Response Prefill</label>
                                <button
                                    onClick={() => setUsePrefill(!usePrefill)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: usePrefill ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}
                                >
                                    {usePrefill ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                </button>
                            </div>
                            {usePrefill && (
                                <>
                                    <textarea
                                        className={styles.input}
                                        rows={3}
                                        value={responsePrefill}
                                        onChange={(e) => {
                                            const words = e.target.value.trim().split(/\s+/);
                                            if (words.length <= 320) {
                                                setResponsePrefill(e.target.value);
                                            }
                                        }}
                                        placeholder="Text to prefill the AI's response..."
                                    />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.2rem 0 0 0' }}>Max 320 words.</p>
                                </>
                            )}
                        </div>
                    </GsapDropdown>

                    <GsapDropdown
                        title="Advanced Settings"
                        isOpen={isAdvancedOpen}
                        onToggle={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    >
                        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.75rem', borderRadius: '6px', color: '#d97706', fontSize: '0.8rem', fontWeight: 500, lineHeight: '1.4' }}>
                            Warning: Don't touch these if you don't know what they do. "Off" (or default 0/1) uses the model's default settings.
                        </div>
                        <div className={styles.inputGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label className={styles.label}>Top K</label>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{topK}</span>
                            </div>
                            <GsapSlider min={0} max={100} step={1} value={topK} onChange={setTopK} />
                        </div>

                        <div className={styles.inputGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label className={styles.label}>Top P</label>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{topP}</span>
                            </div>
                            <GsapSlider min={0} max={1} step={0.05} value={topP} onChange={setTopP} />
                        </div>

                        <div className={styles.inputGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label className={styles.label}>Repetition Penalty</label>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{repPenalty}</span>
                            </div>
                            <GsapSlider min={1} max={2} step={0.05} value={repPenalty} onChange={setRepPenalty} />
                        </div>

                        <div className={styles.inputGroup}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label className={styles.label}>Frequency Penalty</label>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{freqPenalty}</span>
                            </div>
                            <GsapSlider min={-2} max={2} step={0.05} value={freqPenalty} onChange={setFreqPenalty} />
                        </div>
                    </GsapDropdown>
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" onClick={onClose} className={styles.secondaryBtn} disabled={isSaving}>Cancel</button>
                    <button type="button" onClick={handleSave} className={styles.primaryBtn} disabled={isSaving}>
                        {isSaving ? <Loader size={16} className={chatStyles.spinnerIcon} /> : <Save size={16} style={{ marginRight: '0.5rem' }} />}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

interface ChatMemoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChatMemoryModal({ isOpen, onClose }: ChatMemoryModalProps) {
    const params = useParams();
    const chatId = params.id as string;
    const [memoryText, setMemoryText] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (isOpen && chatId) {
            getChatSessionAction(chatId).then(res => {
                if (res.success && res.data) {
                    setMemoryText(res.data.chat.chatMemory || "");
                }
            });
        }
    }, [isOpen, chatId]);

    const handleSave = async () => {
        if (!chatId) return;
        setIsSaving(true);
        const res = await updateChatMemoryAction(chatId, memoryText);
        setIsSaving(false);
        if (res.success) {
            toast.success("Chat memory updated.");
            onClose();
        } else {
            toast.error(res.error || "Failed to update memory.");
        }
    };

    const handleGenerateSummary = async () => {
        if (!chatId) return;
        setIsGenerating(true);
        const toastId = toast.loading("Generating memory summary from last 30 messages...");
        const res = await generateChatMemorySummaryAction(chatId);
        setIsGenerating(false);
        if (res.success && res.memoryText) {
            setMemoryText(res.memoryText);
            toast.success("Memory summary generated successfully!", { id: toastId });
        } else {
            toast.error(res.error || "Failed to generate summary.", { id: toastId });
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1000 }}>
            <motion.div
                className={styles.modalContent}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ maxWidth: '600px', width: '100%', padding: '1.5rem' }}
            >
                <div className={styles.modalHeader} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Chat Memory</h3>
                    <button onClick={onClose} className={styles.iconBtn}><X size={20} /></button>
                </div>

                <div className={styles.modalBody}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                        This memory acts as a persistent context for the AI, injected into every prompt. Use this to summarize past events, remember facts, or enforce rules.
                    </p>

                    <textarea
                        className={styles.input}
                        rows={10}
                        placeholder="e.g. The user's name is Alex. We are currently in a dark forest searching for a lost artifact..."
                        value={memoryText}
                        onChange={(e) => setMemoryText(e.target.value)}
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            padding: '1rem',
                            resize: 'vertical',
                            border: '1px solid var(--border-medium)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div className={styles.modalFooter} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleGenerateSummary}
                        disabled={isGenerating || isSaving}
                        className={styles.secondaryBtn}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: 'auto' }}
                    >
                        {isGenerating && <Loader size={16} className={chatStyles.spinnerIcon} />}
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                    <button type="button" onClick={onClose} className={styles.secondaryBtn} disabled={isSaving || isGenerating}>Cancel</button>
                    <button type="button" onClick={handleSave} className={styles.primaryBtn} disabled={isSaving || isGenerating}>
                        {isSaving ? <Loader size={16} className={chatStyles.spinnerIcon} /> : <Save size={16} style={{ marginRight: '0.5rem' }} />}
                        {isSaving ? 'Updating...' : 'Update Memory'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
