"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Plus, Trash2, Loader2, X, CheckCircle, Cpu, Zap, Edit2, AlertTriangle, Save } from "lucide-react";
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
    const [apiMode, setApiMode] = useState<"our" | "custom">("our");
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [editingConfig, setEditingConfig] = useState<any>(null);

    const [addState, addFormAction, isAddPending] = useActionState(addApiAction, null);
    const [editState, editFormAction, isEditPending] = useActionState(editApiAction, null);

    const [models, setModels] = useState<{ id: string; name: string }[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [fetchError, setFetchError] = useState("");

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

    const [tempApiUrl, setTempApiUrl] = useState("");
    const [tempApiKey, setTempApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [promptProcessing, setPromptProcessing] = useState("none");
    const [customPrompt, setCustomPrompt] = useState("");

    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    const endpointSuffixes = ["/v1", "/v1/chat/completions", "/v1/models", "/api"];
    const fetchModelsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const ourModelsFormRef = useRef<HTMLFormElement>(null);
    const customFormRef = useRef<HTMLFormElement>(null);

    const ourConfig = apiConfigs?.find(api => api.apiUrl === "/api/v1" || (api.apiUrl.includes("/api/v1") && !api.apiUrl.includes("openai.com")));

    const prevAddStateRef = useRef<any>(addState);
    const prevEditStateRef = useRef<any>(editState);

    useEffect(() => {
        if (addState !== prevAddStateRef.current) {
            prevAddStateRef.current = addState;
            if (addState?.success) {
                toast.success("API configuration saved!");
                resetForm();
                onRefresh?.();
            } else if (addState?.error) {
                toast.error(addState.error);
            }
        }
        if (editState !== prevEditStateRef.current) {
            prevEditStateRef.current = editState;
            if (editState?.success) {
                toast.success("API configuration saved!");
                resetForm();
                onRefresh?.();
            } else if (editState?.error) {
                toast.error(editState.error);
            }
        }
    }, [addState, editState, onRefresh]);

    useEffect(() => {
        if (apiMode === 'our' && ourConfig) {
            setSelectedModel(ourConfig.modelName || "");
            setPromptProcessing(ourConfig.promptProcessing || "none");
            setCustomPrompt(ourConfig.customPrompt || "");
            
            if (!ourConfig.isDefault) {
                handleSetDefault(ourConfig.id);
            }
        } else if (apiMode === 'our' && !ourConfig) {
            setSelectedModel("");
            setPromptProcessing("none");
            setCustomPrompt("");
        }
    }, [apiMode, ourConfig]);

    const handleAppendEndpoint = (suffix: string) => {
        const base = tempApiUrl.replace(/\/+$/, "");
        if (!base.endsWith(suffix)) setTempApiUrl(base + suffix);
    };

    const parseApiError = (status: number, body: string): string => {
        try {
            const json = JSON.parse(body);
            return json?.error?.message || json?.message || `Error ${status}`;
        } catch {
            return `Request failed (${status})`;
        }
    };

    const handleFetchModels = async (url?: string, key?: string, mode?: "our" | "custom") => {
        const currentMode = mode || apiMode;
        let apiUrl = url || tempApiUrl;
        let apiKey = key || tempApiKey;

        if (currentMode === "our") {
            apiUrl = window.location.origin + "/api/v1";
            apiKey = "internal"; 
        }

        if (!apiUrl || (!apiKey && currentMode === "custom" && !editingConfig)) return;

        setIsFetchingModels(true);
        setFetchError("");

        try {
            let modelsUrl = apiUrl.replace(/\/+$/, "").replace(/\/(chat\/completions|models)$/, "");
            if (!modelsUrl.endsWith("/v1")) modelsUrl += "/v1";
            modelsUrl += "/models";

            const res = await fetch(modelsUrl, { headers: { "Authorization": `Bearer ${apiKey}` } });
            if (!res.ok) {
                setFetchError("Could not load models");
                setModels([]);
                return;
            }

            const data = await res.json();
            const fetchedModels = (data.data || []).map((m: any) => ({
                id: m.id,
                name: m.display_name || m.id,
            }));

            setModels(fetchedModels);
            if (fetchedModels.length > 0 && !selectedModel) setSelectedModel(fetchedModels[0].id);
        } catch (err: any) {
            setModels([]);
        } finally {
            setIsFetchingModels(false);
        }
    };

    useEffect(() => {
        if (fetchModelsTimerRef.current) clearTimeout(fetchModelsTimerRef.current);

        if (apiMode === "our") {
            fetchModelsTimerRef.current = setTimeout(() => {
                handleFetchModels(window.location.origin + "/api/v1", "internal", "our");
            }, 500);
        } else if (tempApiUrl && tempApiKey && tempApiKey.length >= 8) {
            fetchModelsTimerRef.current = setTimeout(() => {
                handleFetchModels(tempApiUrl, tempApiKey, "custom");
            }, 800);
        }

        return () => { if (fetchModelsTimerRef.current) clearTimeout(fetchModelsTimerRef.current); };
    }, [tempApiUrl, tempApiKey, apiMode]);

    const handleTestConnection = async () => {
        let chatUrl = apiMode === 'our' ? window.location.origin + "/api/v1" : tempApiUrl;
        let authKey = apiMode === 'our' ? "internal" : tempApiKey;

        if (!chatUrl || (!authKey && !editingConfig && apiMode === 'custom')) {
            toast.error("Missing URL or Key");
            return;
        }

        setIsTestingConnection(true);
        try {
            chatUrl = chatUrl.replace(/\/+$/, "").replace(/\/(chat\/completions|models)$/, "");
            if (!chatUrl.endsWith("/v1")) chatUrl += "/v1";
            chatUrl += "/chat/completions";

            const res = await fetch(chatUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authKey}` },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [{ role: "user", content: "hi" }],
                    max_tokens: 10
                }),
            });

            if (res.ok) {
                toast.success("AI Connected!");
            } else {
                const text = await res.text();
                toast.error(parseApiError(res.status, text));
            }
        } catch (err: any) {
            toast.error("Connection failed");
        } finally {
            setIsTestingConnection(false);
        }
    };

    const handleDelete = async (configId: string) => {
        if (!confirm("Delete this configuration?")) return;
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
            onRefresh?.();
        } finally {
            setSettingDefaultId(null);
        }
    };

    const resetForm = () => {
        setEditingConfig(null);
        setIsAddingCustom(false);
        setModels([]);
        setFetchError("");
        setTempApiUrl("");
        setTempApiKey("");
        setSelectedModel("");
        setPromptProcessing("none");
        setCustomPrompt("");
    };

    const startEdit = (config: any) => {
        setEditingConfig(config);
        setIsAddingCustom(true);
        setTempApiUrl(config.apiUrl);
        setSelectedModel(config.modelName);
        setPromptProcessing(config.promptProcessing);
        setCustomPrompt(config.customPrompt || "");
        setTempApiKey("");
    };

    const handleMainSave = () => {
        if (apiMode === 'our') {
            ourModelsFormRef.current?.requestSubmit();
        } else if (isAddingCustom) {
            customFormRef.current?.requestSubmit();
        } else {
            onClose();
        }
    };

    const promptProcessingOptions = [
        { value: "none", label: "None" },
        { value: "merge", label: "Merge Same-Role" },
        { value: "semi-strict", label: "Semi-strict" },
        { value: "strict", label: "Strict" },
        { value: "single-user", label: "Single User" },
    ];

    if (!isOpen) return null;

    const customConfigs = apiConfigs?.filter(api => api.apiUrl !== "/api/v1" && !(api.apiUrl.includes("/api/v1") && !api.apiUrl.includes("openai.com"))) || [];

    return (
        <div className={styles.modalOverlay} style={{ zIndex: 1000 }}>
            <motion.div
                className={styles.modalContent}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                style={{ maxWidth: '600px', width: '100%', maxHeight: '95vh', overflowY: 'auto' }}
            >
                <div className={styles.modalHeader}>
                    <h3>API Settings</h3>
                    <button onClick={onClose} className={styles.iconBtn}><X size={20} /></button>
                </div>

                <div className={styles.modalBody} style={{ paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                        <button 
                            onClick={() => { setApiMode('our'); resetForm(); }}
                            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: apiMode === 'our' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: apiMode === 'our' ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Our Models
                        </button>
                        <button 
                            onClick={() => { setApiMode('custom'); resetForm(); }}
                            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: apiMode === 'custom' ? '2px solid var(--accent-primary)' : '2px solid transparent', color: apiMode === 'custom' ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Custom APIs
                        </button>
                    </div>

                    {apiMode === 'our' ? (
                        <form ref={ourModelsFormRef} action={ourConfig ? editFormAction : addFormAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <input type="hidden" name="configName" value="Our Model" />
                            <input type="hidden" name="apiUrl" value="/api/v1" />
                            <input type="hidden" name="apiKey" value="internal" />
                            {ourConfig && <input type="hidden" name="configId" value={ourConfig.id} />}
                            
                            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', color: '#eab308', fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                                <p style={{ margin: 0 }}>Built-in models are currently in beta.</p>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Model Selection</label>
                                <input type="hidden" name="modelName" value={selectedModel} />
                                <CustomDropdown
                                    options={models.map(m => ({ id: m.id, label: m.name }))}
                                    value={selectedModel}
                                    onChange={v => {
                                        setSelectedModel(v);
                                        setTimeout(() => {
                                            ourModelsFormRef.current?.requestSubmit();
                                        }, 0);
                                    }}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Prompt Processing</label>
                                <input type="hidden" name="promptProcessing" value={promptProcessing} />
                                <CustomDropdown
                                    options={promptProcessingOptions.map(o => ({ id: o.value, label: o.label }))}
                                    value={promptProcessing}
                                    onChange={v => {
                                        setPromptProcessing(v);
                                        setTimeout(() => {
                                            ourModelsFormRef.current?.requestSubmit();
                                        }, 0);
                                    }}
                                />
                            </div>
                        </form>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {!isAddingCustom ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0 }}>Custom Configurations</h4>
                                        <button onClick={() => setIsAddingCustom(true)} className={styles.primaryBtn} style={{ padding: '0.4rem', borderRadius: '50%' }}>
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                    <div className={styles.apiList}>
                                        {customConfigs.length > 0 ? (
                                            customConfigs.map(api => (
                                                <div key={api.id} className={styles.apiCard} style={api.isDefault ? { borderColor: 'var(--accent-primary)', cursor: 'pointer' } : { cursor: 'pointer' }} onClick={() => handleSetDefault(api.id)}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {api.isDefault ? <CheckCircle size={18} style={{ color: 'var(--accent-primary)' }} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border-color)' }} />}
                                                            <div>
                                                                <h4 style={{ margin: 0 }}>{api.configName}</h4>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{api.modelName}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                                                            <button onClick={() => startEdit(api)} className={styles.iconBtn}><Edit2 size={16} /></button>
                                                            <button onClick={() => handleDelete(api.id)} className={styles.iconBtn} disabled={deletingId === api.id} style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '1rem 0' }}>No custom APIs configured.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <form ref={customFormRef} action={editingConfig ? editFormAction : addFormAction} style={{ border: '1px solid var(--border-light)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0 }}>{editingConfig ? 'Edit Configuration' : 'Add New Custom API'}</h4>
                                        <button type="button" onClick={resetForm} className={styles.iconBtn}><X size={18} /></button>
                                    </div>
                                    {editingConfig && <input type="hidden" name="configId" value={editingConfig.id} />}
                                    
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Name</label>
                                        <input name="configName" defaultValue={editingConfig?.configName} className={styles.input} placeholder="e.g. My API" required />
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>URL</label>
                                        <input name="apiUrl" value={tempApiUrl} onChange={e => setTempApiUrl(e.target.value)} className={styles.input} placeholder="https://..." required />
                                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                            {endpointSuffixes.map(s => <button key={s} type="button" onClick={() => handleAppendEndpoint(s)} className={styles.apiBadge} style={{ cursor: 'pointer', border: '1px solid var(--border-light)', background: 'none', fontSize: '0.65rem' }}>{s}</button>)}
                                        </div>
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Key {editingConfig && <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>(Blank to keep)</span>}</label>
                                        <input name="apiKey" type="password" value={tempApiKey} onChange={e => setTempApiKey(e.target.value)} className={styles.input} placeholder="sk-..." required={!editingConfig} />
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Model</label>
                                        <input name="modelName" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className={styles.input} placeholder="gpt-4" required />
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className={styles.secondaryBtn}>{apiMode === 'our' ? 'Close' : 'Cancel'}</button>
                        
                        <button 
                            type="button" 
                            onClick={handleTestConnection} 
                            className={apiMode === 'our' ? styles.primaryBtn : styles.secondaryBtn} 
                            style={apiMode === 'our' ? { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: isTestingConnection ? 'var(--bg-tertiary)' : 'var(--accent-primary)', color: isTestingConnection ? 'var(--text-secondary)' : '#fff', fontWeight: 600, border: 'none', borderRadius: 'var(--radius-md)' } : { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-light)' }}
                            disabled={isTestingConnection}
                        >
                            {isTestingConnection ? <><Loader2 className="animate-spin" size={16} /> Testing...</> : <><Zap size={16} fill={apiMode === 'our' ? "currentColor" : "none"} /> {apiMode === 'our' ? 'Test AI Connection' : 'Test AI Integration'}</>}
                        </button>

                        {apiMode !== 'our' && (
                            <button type="button" onClick={handleMainSave} className={styles.primaryBtn} disabled={isAddPending || isEditPending || settingDefaultId !== null}>
                                {(isAddPending || isEditPending) ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save</>}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
