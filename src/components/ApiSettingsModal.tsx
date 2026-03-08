"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Plus, Trash2, Loader2, X, CheckCircle, Cpu, Zap, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CustomDropdown } from "@/components/CustomDropdown";
import styles from "@/app/(main)/settings/settings.module.css";
import { addApiAction, deleteApiAction, setDefaultApiAction, editApiAction } from "@/app/(main)/settings/actions";

interface ApiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiConfigs: any[];
    onRefresh?: () => void;
}

export function ApiSettingsModal({ isOpen, onClose, apiConfigs, onRefresh }: ApiSettingsModalProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

    const [addState, addFormAction, isAddPending] = useActionState(addApiAction, null);
    const [editState, editFormAction, isEditPending] = useActionState(editApiAction, null);

    const [models, setModels] = useState<{ id: string; name: string }[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [fetchError, setFetchError] = useState("");

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
    const [testingConfigId, setTestingConfigId] = useState<string | null>(null);

    const [tempConfigName, setTempConfigName] = useState("");
    const [tempApiUrl, setTempApiUrl] = useState("");
    const [tempApiKey, setTempApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [promptProcessing, setPromptProcessing] = useState("none");
    const [customPrompt, setCustomPrompt] = useState("");

    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);

    const endpointSuffixes = ["/v1", "/v1/chat/completions", "/v1/models", "/api"];
    const fetchModelsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastAddStateRef = useRef<any>(null);
    const lastEditStateRef = useRef<any>(null);

    useEffect(() => {
        if (addState?.success && addState !== lastAddStateRef.current) {
            lastAddStateRef.current = addState;
            toast.success("New API Configuration added!", {
                icon: <CheckCircle className="animate-bounce" size={18} style={{ color: '#10b981' }} />,
                position: "bottom-center"
            });
            resetAddModal();
            onRefresh?.();
        } else if (addState?.error && addState !== lastAddStateRef.current) {
            lastAddStateRef.current = addState;
            toast.error(addState.error);
        }
    }, [addState, onRefresh]);

    useEffect(() => {
        if (editState?.success && editState !== lastEditStateRef.current) {
            lastEditStateRef.current = editState;
            toast.success("API Configuration updated!", {
                icon: <CheckCircle className="animate-bounce" size={18} style={{ color: '#10b981' }} />,
                position: "bottom-center"
            });
            resetAddModal();
            onRefresh?.();
        } else if (editState?.error && editState !== lastEditStateRef.current) {
            lastEditStateRef.current = editState;
            toast.error(editState.error);
        }
    }, [editState, onRefresh]);

    const handleAppendEndpoint = (suffix: string) => {
        const base = tempApiUrl.replace(/\/+$/, "");
        if (!base.endsWith(suffix)) {
            setTempApiUrl(base + suffix);
        }
    };

    const parseApiError = (status: number, body: string): string => {
        try {
            const json = JSON.parse(body);
            const msg = json?.error?.message || json?.message || json?.detail || "";
            if (status === 401) return "Invalid API Key. Please check your key and try again.";
            if (status === 403) return "Access denied. Your API key may not have the required permissions.";
            if (status === 404) return "Endpoint not found. Try appending a different suffix (e.g. /v1) to your URL.";
            if (status === 429) return "Rate limit exceeded. Please wait a moment and try again.";
            if (status >= 500) return `Server error (${status}). The API provider may be experiencing issues.`;
            if (msg) return msg.slice(0, 200);
            return `Request failed with status ${status}.`;
        } catch {
            if (status === 401) return "Invalid API Key. Please check your key and try again.";
            if (status === 404) return "Endpoint not found. Try appending a different suffix to your URL.";
            return `Request failed with status ${status}.`;
        }
    };

    const handleFetchModels = async (url?: string, key?: string) => {
        const apiUrl = url || tempApiUrl;
        const apiKey = key || tempApiKey;
        if (!apiUrl || !apiKey || (editingConfigId && !tempApiKey)) return; // If editing and no new key entered, don't auto fetch to prevent bad queries

        setIsFetchingModels(true);
        setFetchError("");

        try {
            let modelsUrl = apiUrl.replace(/\/+$/, "");
            modelsUrl = modelsUrl.replace(/\/(chat\/completions|models)$/, "");
            if (!modelsUrl.endsWith("/v1")) {
                modelsUrl += "/v1";
            }
            modelsUrl += "/models";

            const res = await fetch(modelsUrl, {
                headers: { "Authorization": `Bearer ${apiKey}` },
            });

            if (!res.ok) {
                const text = await res.text();
                setFetchError(parseApiError(res.status, text));
                setModels([]);
                return;
            }

            const data = await res.json();
            const fetchedModels = (data.data || []).map((m: any) => ({
                id: m.id,
                name: m.display_name || m.id,
            }));

            setModels(fetchedModels);
            // Only set selected model to first one if it's currently empty
            if (fetchedModels.length > 0 && !selectedModel) {
                setSelectedModel(fetchedModels[0].id);
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setFetchError("Could not connect to the API. Please check your URL.");
            }
            setModels([]);
        } finally {
            setIsFetchingModels(false);
        }
    };

    useEffect(() => {
        if (fetchModelsTimerRef.current) {
            clearTimeout(fetchModelsTimerRef.current);
        }

        if (tempApiUrl && tempApiKey && tempApiKey.length >= 8) {
            fetchModelsTimerRef.current = setTimeout(() => {
                handleFetchModels(tempApiUrl, tempApiKey);
            }, 800);
        } else if (!editingConfigId) {
            setModels([]);
        }

        return () => {
            if (fetchModelsTimerRef.current) {
                clearTimeout(fetchModelsTimerRef.current);
            }
        };
    }, [tempApiUrl, tempApiKey]);

    const handleTestConnection = async () => {
        if (!tempApiUrl) {
            setFetchError("Please enter your API URL first.");
            return;
        }
        if (!tempApiKey && !editingConfigId) {
            setFetchError("Please enter your API Key first.");
            return;
        }
        if (!selectedModel) {
            setFetchError("Please select or type a model name first.");
            return;
        }
        setIsTestingConnection(true);
        setTestResult(null);
        setFetchError("");
        try {
            let chatUrl = tempApiUrl.replace(/\/+$/, "");
            chatUrl = chatUrl.replace(/\/(chat\/completions|models)$/, "");
            if (!chatUrl.endsWith("/v1")) {
                chatUrl += "/v1";
            }
            chatUrl += "/chat/completions";

            if (editingConfigId && !tempApiKey) {
                setFetchError("Please enter the API key again to test the connection.");
                setIsTestingConnection(false);
                return;
            }

            const res = await fetch(chatUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tempApiKey}`,
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [{ role: "user", content: "Hello! How are you?" }],
                    max_tokens: 100,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const reply = data.choices?.[0]?.message?.content || "(No response content)";
                setTestResult(null);
                toast.success("Your API is Connected!", {
                    icon: <Cpu className="animate-pulse" size={18} style={{ color: 'var(--accent-primary)' }} />,
                    description: `AI replied: "${reply.slice(0, 150)}..."`
                });
            } else {
                const text = await res.text();
                setTestResult({ success: false, message: parseApiError(res.status, text) });
            }
        } catch (err: any) {
            setTestResult({ success: false, message: "Could not connect to the API. Please check your URL and try again." });
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleDelete = async (configId: string) => {
        setDeletingId(configId);
        try {
            await deleteApiAction(configId);
            onRefresh?.();
        } finally {
            setDeletingId(null);
        }
    };

    const handleSetDefault = async (configId: string) => {
        setSettingDefaultId(configId);
        try {
            await setDefaultApiAction(configId);
            toast.success("Set as default API configuration.");
            onRefresh?.();
        } finally {
            setSettingDefaultId(null);
        }
    };

    const startEditMode = (config: any) => {
        setEditingConfigId(config.id);
        setTempConfigName(config.configName || "");
        setTempApiUrl(config.apiUrl || "");
        setTempApiKey("");
        setSelectedModel(config.modelName || "");
        setPromptProcessing(config.promptProcessing || "none");
        setCustomPrompt(config.customPrompt || "");

        let loadedModels: { id: string; name: string }[] = [];
        try {
            if (config.modelList) {
                const parsedIds = JSON.parse(config.modelList);
                if (Array.isArray(parsedIds)) {
                    loadedModels = parsedIds.map(id => ({ id, name: id }));
                }
            }
        } catch (e) { }

        if (loadedModels.length === 0 && config.modelName) {
            loadedModels = [{ id: config.modelName, name: config.modelName }];
        }

        setModels(loadedModels);
        setIsAddModalOpen(true);
    };

    const handleTestExistingConfig = async (api: any) => {
        setTestingConfigId(api.id);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: 'test-connection',
                    characterId: 'test',
                    configId: api.id,
                    userName: 'User',
                    messages: [{ role: 'user', content: 'Hello, respond with a short greeting.' }],
                    testMode: true,
                }),
            });

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No reader");

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Failed to connect" }));
                toast.error(err.error || `Test failed (${res.status})`);
                return;
            }

            let fullReply = "";
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
                            if (parsed.type === 'content') {
                                fullReply += parsed.text;
                            }
                        } catch (e) { }
                    }
                }
            }

            if (fullReply) {
                toast.success("API Connected!", {
                    icon: <Cpu className="animate-pulse" size={18} style={{ color: 'var(--accent-primary)' }} />,
                    description: `AI replied: "${fullReply.slice(0, 100)}..."`
                });
            } else {
                toast.error("Connected but received empty response.");
            }
        } catch (err: any) {
            toast.error(err.message || "Could not connect to the API.");
        } finally {
            setTestingConfigId(null);
        }
    };

    const resetAddModal = () => {
        setIsAddModalOpen(false);
        setEditingConfigId(null);
        setModels([]);
        setFetchError("");
        setTempConfigName("");
        setTempApiUrl("");
        setTempApiKey("");
        setSelectedModel("");
        setPromptProcessing("none");
        setCustomPrompt("");
        setTestResult(null);
        setShowApiKey(false);
    };

    const promptProcessingOptions = [
        { value: "none", label: "None — no explicit processing" },
        { value: "merge", label: "Merge consecutive same-role messages" },
        { value: "semi-strict", label: "Semi-strict — merge + 1 system message" },
        { value: "strict", label: "Strict — merge + 1 system + user first" },
        { value: "single-user", label: "Single user message — collapse all" },
    ];

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1000 }}>
            <motion.div
                className={styles.modalContent}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            >
                <div className={styles.modalHeader}>
                    <h3>API Settings</h3>
                    <button onClick={onClose} className={styles.iconBtn}><X size={20} /></button>
                </div>

                <div className={styles.modalBody}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Your Configurations</h4>
                        <button onClick={() => { resetAddModal(); setIsAddModalOpen(true); }} className={styles.primaryBtn} style={{ padding: '0.4rem', borderRadius: '50%' }}>
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className={styles.apiList}>
                        {apiConfigs && apiConfigs.length > 0 ? (
                            apiConfigs.map(api => (
                                <div key={api.id} className={styles.apiCard} style={api.isDefault ? { borderColor: 'var(--accent-primary)', boxShadow: '0 0 0 1px var(--accent-primary)' } : {}}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                            {api.configName}
                                            {api.isDefault && <span style={{ fontSize: '0.65rem', background: 'var(--accent-primary)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>DEFAULT</span>}
                                        </h4>
                                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                            <button
                                                onClick={() => handleSetDefault(api.id)}
                                                className={styles.iconBtn}
                                                disabled={api.isDefault || settingDefaultId === api.id}
                                                title={api.isDefault ? "Current Default" : "Set as Default"}
                                            >
                                                {settingDefaultId === api.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} style={{ color: api.isDefault ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />}
                                            </button>
                                            <button
                                                onClick={() => handleTestExistingConfig(api)}
                                                className={styles.iconBtn}
                                                disabled={testingConfigId === api.id}
                                                title="Test Connection"
                                            >
                                                {testingConfigId === api.id ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                                            </button>
                                            <button
                                                onClick={() => startEditMode(api)}
                                                className={styles.iconBtn}
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(api.id)}
                                                className={styles.iconBtn}
                                                disabled={deletingId === api.id}
                                                title="Delete"
                                            >
                                                {deletingId === api.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                        <span className={styles.apiBadge}>{api.modelName}</span>
                                    </div>
                                    <p className={styles.apiSecret} style={{ marginTop: '0.5rem' }}>••••••••••••{api.apiKey?.slice(-8) || "••••"}</p>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>No API Configurations added yet.</p>
                        )}
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {isAddModalOpen && (
                    <div className={styles.modalOverlay} style={{ zIndex: 1001 }}>
                        <motion.div
                            className={styles.modalContent}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            <div className={styles.modalHeader}>
                                <h3>{editingConfigId ? "Edit API Configuration" : "Add API Configuration"}</h3>
                                <button onClick={resetAddModal} className={styles.iconBtn}><X size={20} /></button>
                            </div>
                            <form action={editingConfigId ? editFormAction : addFormAction} className={styles.modalBody}>
                                {editingConfigId && <input type="hidden" name="configId" value={editingConfigId} />}

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Configuration Name</label>
                                    <input
                                        name="configName"
                                        type="text"
                                        className={styles.input}
                                        placeholder="e.g. My OpenRouter"
                                        value={tempConfigName}
                                        onChange={(e) => setTempConfigName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>API URL</label>
                                    <input
                                        name="apiUrl"
                                        type="url"
                                        className={styles.input}
                                        placeholder="https://api.openai.com"
                                        value={tempApiUrl}
                                        onChange={(e) => setTempApiUrl(e.target.value)}
                                        required
                                    />
                                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                                        {endpointSuffixes.map(suffix => (
                                            <button
                                                key={suffix}
                                                type="button"
                                                onClick={() => handleAppendEndpoint(suffix)}
                                                style={{
                                                    padding: '0.15rem 0.5rem',
                                                    fontSize: '0.7rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid var(--border-light)',
                                                    background: 'var(--bg-tertiary)',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    fontFamily: 'monospace',
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                            >
                                                {suffix}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>API Key {editingConfigId && <span style={{ fontSize: '0.7rem', fontStyle: 'italic', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>(Leave blank to keep current)</span>}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            name="apiKey"
                                            type={showApiKey ? "text" : "password"}
                                            className={styles.input}
                                            style={{ paddingRight: '2.5rem' }}
                                            placeholder={editingConfigId ? "•••••••••••••" : "sk-..."}
                                            value={tempApiKey}
                                            onChange={(e) => setTempApiKey(e.target.value)}
                                            autoComplete="off"
                                            required={!editingConfigId}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            style={{
                                                position: 'absolute',
                                                right: '0.6rem',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-tertiary)',
                                                padding: '0.25rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                            title={showApiKey ? "Hide API Key" : "Show API Key"}
                                        >
                                            {showApiKey ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Model</label>
                                    <input
                                        name="modelName"
                                        type="text"
                                        className={styles.input}
                                        placeholder="gpt-4o, claude-3-5-sonnet..."
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        Model Selection
                                        {isFetchingModels && <Loader2 className="animate-spin" size={14} style={{ color: 'var(--accent-primary)' }} />}
                                    </label>
                                    {models.length > 0 ? (
                                        <CustomDropdown
                                            options={models.map(m => ({ id: m.id, label: m.name }))}
                                            value={selectedModel}
                                            onChange={(val) => setSelectedModel(val)}
                                        />
                                    ) : (
                                        <div style={{
                                            padding: '0.6rem 1rem',
                                            borderRadius: 'var(--radius-full)',
                                            border: '1px solid var(--border-light)',
                                            background: 'var(--bg-secondary)',
                                            color: 'var(--text-tertiary)',
                                            fontSize: '0.875rem',
                                        }}>
                                            {isFetchingModels
                                                ? "Loading models..."
                                                : (!tempApiUrl || (!tempApiKey && !editingConfigId))
                                                    ? "Enter API URL & Key to load models"
                                                    : fetchError
                                                        ? "Could not load models"
                                                        : "No models found"}
                                        </div>
                                    )}
                                </div>

                                {fetchError && (
                                    <div style={{
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'rgba(239, 68, 68, 0.08)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        fontSize: '0.8rem',
                                    }}>
                                        {fetchError}
                                    </div>
                                )}

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Prompt Post Processing</label>
                                    <input type="hidden" name="promptProcessing" value={promptProcessing} />
                                    <CustomDropdown
                                        options={promptProcessingOptions.map(opt => ({ id: opt.value, label: opt.label }))}
                                        value={promptProcessing}
                                        onChange={(val) => setPromptProcessing(val)}
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Custom Prompt (Optional)</label>
                                    <textarea
                                        name="customPrompt"
                                        rows={2}
                                        className={styles.input}
                                        placeholder="Optional system prompt override..."
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                    ></textarea>
                                </div>

                                <input type="hidden" name="modelList" value={JSON.stringify(models.map(m => m.id))} />

                                {testResult && !testResult.success && (
                                    <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                        {testResult.message}
                                    </div>
                                )}

                                <div className={styles.modalFooter}>
                                    <button type="button" onClick={resetAddModal} className={styles.secondaryBtn}>Cancel</button>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="button" onClick={handleTestConnection} className={styles.secondaryBtn} disabled={isTestingConnection}>
                                            {isTestingConnection ? <Loader2 className="animate-spin" size={16} /> : "Test Connection"}
                                        </button>
                                        <button type="submit" className={styles.primaryBtn} disabled={isAddPending || isEditPending}>
                                            {(isAddPending || isEditPending) ? <Loader2 className="animate-spin" size={16} /> : "Save API"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
