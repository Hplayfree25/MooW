"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import {
    updateProfileAction,
    updatePrivacyAction,
    updateNotificationAction,
    addApiAction,
    updateAvatarAction,
    deleteAvatarAction,
    editApiAction,
    deleteApiAction,
    setDefaultApiAction
} from "./actions";
import { signOut } from "next-auth/react";
import styles from "./settings.module.css";
import { LogOut, Loader2, Save, Plus, X, User, Trash2, RefreshCw, ChevronDown, CheckCircle, Cpu, AlertTriangle, Edit2, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CustomDropdown } from "@/components/CustomDropdown";
import { toast } from "sonner";

export function SettingsForm({ user, settings, apiConfigs }: { user: any, settings: any, apiConfigs: any[] }) {
    const [activeTab, setActiveTab] = useState("Profile");

    const tabs = ["Profile", "Privacy & Security", "Notification", "API Settings", "Theme Settings"];

    return (
        <div className={styles.settingsLayout}>
            <div className={styles.settingsContent}>
                {activeTab === "Profile" && <ProfileTab user={user} />}
                {activeTab === "Privacy & Security" && <PrivacyTab user={user} settings={settings} />}
                {activeTab === "Notification" && <NotificationTab settings={settings} />}
                {activeTab === "API Settings" && <ApiTab apiConfigs={apiConfigs} />}
                {activeTab === "Theme Settings" && <ThemeTab />}
            </div>

            <div className={styles.settingsTabs}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
                
                <button
                    className={`${styles.tabBtn} ${styles.mobileLogoutBtn}`}
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    title="Log Out"
                >
                    <LogOut size={18} />
                    <span>Log Out</span>
                </button>
            </div>
        </div>
    );
}

import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";

function AvatarUploader({ user }: { user: any }) {
    const [state, formAction, isPending] = useActionState(updateAvatarAction, null);
    const [delState, delAction, isDelPending] = useActionState(deleteAvatarAction, null);

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [originalFile, setOriginalFile] = useState<File | null>(null);

    useEffect(() => {
        if (state?.error) {
            toast.error(state.error);
        } else if (state?.success) {
            toast.success("Avatar uploaded successfully!");
        }
    }, [state]);

    useEffect(() => {
        if (delState?.error) {
            toast.error(delState.error);
        } else if (delState?.success) {
            toast.success("Avatar removed.");
        }
    }, [delState]);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setOriginalFile(file);
            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl);
            setIsCropping(true);
            e.target.value = '';
        }
    };

    const readFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result as string), false);
            reader.readAsDataURL(file);
        });
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleUploadCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsCompressing(true);
        try {
            const formData = new FormData();

            if (originalFile && originalFile.type === "image/gif") {
                formData.append("image", originalFile);
                formData.append("cropData", JSON.stringify(croppedAreaPixels));
            } else {
                const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
                formData.append("image", croppedBlob, "avatar.webp");
            }

            const result = await updateAvatarAction(null, formData);
            if (result && result.error) {
                console.error("Upload error:", result.error);
                toast.error(result.error);
            } else if (result && result.success) {
                toast.success("Avatar uploaded successfully!");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCompressing(false);
            setIsCropping(false);
            setImageSrc(null);
            setOriginalFile(null);
        }
    };

    return (
        <div className={styles.avatarSection}>
            <div className={styles.avatarCircle}>
                {user?.image ? <img src={user.image} alt="Avatar" /> : <User size={40} />}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="file"
                    id="avatarInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={onFileChange}
                />
                <button
                    type="button"
                    onClick={() => document.getElementById("avatarInput")?.click()}
                    className={styles.secondaryBtn}
                    disabled={isPending || isDelPending || isCompressing}
                >
                    {isPending || isCompressing ? <Loader2 className="animate-spin" size={16} /> : "Upload Image"}
                </button>

                {user?.image && (
                    <form action={delAction}>
                        <button
                            type="submit"
                            className={styles.iconBtn}
                            style={{ color: '#ef4444' }}
                            disabled={isDelPending || isPending || isCompressing}
                            title="Remove Avatar"
                        >
                            {isDelPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={18} />}
                        </button>
                    </form>
                )}
            </div>

            <AnimatePresence>
                {isCropping && imageSrc && (
                    <div className={styles.modalOverlay}>
                        <motion.div
                            className={styles.modalContent}
                            style={{ maxWidth: '600px' }}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                        >
                            <div className={styles.modalHeader}>
                                <h3>Crop Profile Picture</h3>
                                <button onClick={() => setIsCropping(false)} className={styles.iconBtn}><X size={20} /></button>
                            </div>
                            <div className={styles.modalBody} style={{ position: 'relative', height: '400px', padding: 0 }}>
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, paddingRight: '20px' }}>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        area-labelledby="Zoom"
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" onClick={() => setIsCropping(false)} className={styles.secondaryBtn}>Cancel</button>
                                    <button type="button" onClick={handleUploadCroppedImage} className={styles.primaryBtn} disabled={isCompressing}>
                                        {isCompressing ? <Loader2 className="animate-spin" size={16} /> : "Save Avatar"}
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

function ProfileTab({ user }: { user: any }) {
    const [state, formAction, isPending] = useActionState(updateProfileAction, null);

    useEffect(() => {
        if (state?.success) {
            toast.success("Profile saved successfully!");
        } else if (state?.error) {
            toast.error(state.error);
        }
    }, [state]);

    return (
        <div className={styles.formPanel}>
            <h2 className={styles.panelTitle}>Profile Information</h2>

            <AvatarUploader user={user} />

            <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.inputGroup}>
                    <label htmlFor="username" className={styles.label}>Username</label>
                    <input
                        id="username" name="username" type="text"
                        defaultValue={user?.username || ""}
                        placeholder="Your unique handle"
                        className={styles.input}
                        autoComplete="off"
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="name" className={styles.label}>Name (Main Persona)</label>
                    <input
                        id="name" name="name" type="text"
                        defaultValue={user?.name || ""}
                        placeholder="Persona name for AI conversations"
                        pattern="^[a-zA-Z0-9_ ]{1,44}$"
                        className={styles.input}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="aboutMe" className={styles.label}>About Me (Supports Markdown)</label>
                    <RichTextEditor
                        name="aboutMe"
                        defaultValue={user?.aboutMe || ""}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="appearance" className={styles.label}>Appearance (Main Persona)</label>
                    <textarea
                        id="appearance" name="appearance" rows={4}
                        defaultValue={user?.appearance || ""}
                        className={styles.input}
                        placeholder="Describe your persona's physical appearance..."
                    />
                </div>

                <button type="submit" className={styles.saveButton} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} /> Save Profile</>}
                </button>
            </form>
        </div>
    );
}

function PrivacyTab({ user, settings }: { user: any, settings: any }) {
    const [state, formAction, isPending] = useActionState(updatePrivacyAction, null);

    useEffect(() => {
        if (state?.success) {
            toast.success("Privacy settings saved!");
        } else if (state?.error) {
            toast.error(state.error);
        }
    }, [state]);

    return (
        <form action={formAction} className={styles.formPanel}>
            <h2 className={styles.panelTitle}>Privacy & Security</h2>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Email Address</label>
                <input type="email" value={user?.email || ""} disabled className={styles.input} />
                <button type="button" className={styles.linkBtn}>Update Email Address</button>
            </div>

            <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                <label className={styles.label}>Change Password</label>
                <input type="password" placeholder="New Password" name="newPassword" autoComplete="new-password" className={styles.input} />
            </div>

            <div className={styles.toggleGroup} style={{ marginTop: '2rem' }}>
                <div>
                    <h3 className={styles.toggleTitle}>Enable NSFW Content</h3>
                    <p className={styles.toggleDesc}>Allow 18+ content filters to be bypassed.</p>
                </div>
                <label className={styles.switch}>
                    <input type="checkbox" name="nsfwEnabled" defaultChecked={settings?.nsfwEnabled} />
                    <span className={styles.slider}></span>
                </label>
            </div>

            <button type="submit" className={styles.saveButton} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} /> Save Settings</>}
            </button>

            <div className={styles.dangerZone}>
                <h3 className={styles.dangerTitle}>Danger Zone</h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Deleting your account is permanent.</p>
                <button type="button" className={styles.logoutButton}>Delete Account</button>
            </div>
        </form>
    );
}

function NotificationTab({ settings }: { settings: any }) {
    const [state, formAction, isPending] = useActionState(updateNotificationAction, null);

    useEffect(() => {
        if (state?.success) {
            toast.success("Notifications updated!");
        } else if (state?.error) {
            toast.error(state.error);
        }
    }, [state]);

    const notifications = [
        { id: "newCommentNotification", title: "New Comment Notification", desc: "Get notified when a new comment is submitted to your characters." },
        { id: "newReplyNotification", title: "New Reply Notification", desc: "Get notified when a new reply is submitted to your comment." },
        { id: "commentPinnedNotification", title: "Comment Pinned Notification", desc: "Get notified when a creator pins your comment." },
        { id: "newCharacterNotification", title: "New Character Created Notification", desc: "Get notified when a creator you follow publishes a new character." },
        { id: "characterUpdatedNotification", title: "Character Updated Notification", desc: "Get notified when a creator you follow updates a character." },
        { id: "communityPollNotification", title: "Community Poll Notification", desc: "Get notified when a new community poll goes live." },
        { id: "newFollowerNotification", title: "New Follower Notification", desc: "Get notified when someone follows you." },
        { id: "characterFavoritedNotification", title: "Character Favorited Notification", desc: "Get notified when someone favorites your character." },
        { id: "commentLikedNotification", title: "Comment Liked Notification", desc: "Get notified when someone likes your comment." },
        { id: "replyLikedNotification", title: "Reply Liked Notification", desc: "Get notified when someone likes your reply to a comment." },
    ];

    return (
        <form action={formAction} className={styles.formPanel}>
            <h2 className={styles.panelTitle}>Notification Preferences</h2>

            <div className={styles.notificationList}>
                {notifications.map(n => (
                    <div key={n.id} className={styles.toggleGroup}>
                        <div>
                            <h3 className={styles.toggleTitle}>{n.title}</h3>
                            <p className={styles.toggleDesc}>{n.desc}</p>
                        </div>
                        <label className={styles.switch}>
                            <input type="checkbox" name={n.id} defaultChecked={settings ? settings[n.id] : true} />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                ))}
            </div>

            <button type="submit" className={styles.saveButton} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} /> Save Notifications</>}
            </button>
        </form>
    );
}

function ApiTab({ apiConfigs }: { apiConfigs: any[] }) {
    const [apiMode, setApiMode] = useState<"our" | "custom">("our");
    const [isAddingCustom, setIsAddingCustom] = useState(false);
    const [editingConfig, setEditingConfig] = useState<any>(null);

    const [addState, addFormAction, isAddPending] = useActionState(addApiAction, null);
    const [editState, editFormAction, isEditPending] = useActionState(editApiAction, null);

    const [models, setModels] = useState<{ id: string; name: string }[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [tempApiUrl, setTempApiUrl] = useState("");
    const [tempApiKey, setTempApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [promptProcessing, setPromptProcessing] = useState("none");
    const [customPrompt, setCustomPrompt] = useState("");
    const [isTestingConnection, setIsTestingConnection] = useState(false);

    const endpointSuffixes = ["/v1", "/v1/chat/completions", "/v1/models", "/api"];
    const fetchModelsTimerRef = useRef<NodeJS.Timeout | null>(null);

    const ourConfig = apiConfigs?.find(api => api.apiUrl === "/api/v1" || (api.apiUrl.includes("/api/v1") && !api.apiUrl.includes("openai.com")));

    const prevAddStateRef = useRef<any>(addState);
    const prevEditStateRef = useRef<any>(editState);

    useEffect(() => {
        if (addState !== prevAddStateRef.current) {
            prevAddStateRef.current = addState;
            if (addState?.success) {
                if (apiMode !== 'our') {
                    toast.success("API configuration saved!");
                    resetForm();
                }
            } else if (addState?.error) {
                toast.error(addState.error);
            }
        }
        if (editState !== prevEditStateRef.current) {
            prevEditStateRef.current = editState;
            if (editState?.success) {
                if (apiMode !== 'our') {
                    toast.success("API configuration saved!");
                    resetForm();
                }
            } else if (editState?.error) {
                toast.error(editState.error);
            }
        }
    }, [addState, editState, apiMode]);

    useEffect(() => {
        if (apiMode === 'our' && ourConfig) {
            setSelectedModel(ourConfig.modelName || "");
            setPromptProcessing(ourConfig.promptProcessing || "none");
            setCustomPrompt(ourConfig.customPrompt || "");

            if (!ourConfig.isDefault) {
                setDefaultApiAction(ourConfig.id);
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
            apiUrl = "/api/v1";
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
            handleFetchModels("/api/v1", "internal", "our");
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
        if (!confirm("Are you sure?")) return;
        setDeletingId(configId);
        try {
            await deleteApiAction(configId);
            toast.success("Deleted");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSetDefault = async (configId: string) => {
        try {
            await setDefaultApiAction(configId);
            toast.success("Selected as default");
        } catch (e) { }
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

    const promptProcessingOptions = [
        { value: "none", label: "None" },
        { value: "merge", label: "Merge Same-Role" },
        { value: "semi-strict", label: "Semi-strict" },
        { value: "strict", label: "Strict" },
        { value: "single-user", label: "Single User" },
    ];

    const customConfigs = apiConfigs?.filter(api => api.apiUrl !== "/api/v1" && !(api.apiUrl.includes("/api/v1") && !api.apiUrl.includes("openai.com"))) || [];

    return (
        <div className={styles.formPanel}>
            <div className={styles.tabsHeader}>
                <button
                    onClick={() => { setApiMode('our'); resetForm(); }}
                    className={`${styles.tabLink} ${apiMode === 'our' ? styles.tabLinkActive : ''}`}
                >
                    Our Models
                </button>
                <button
                    onClick={() => { setApiMode('custom'); resetForm(); }}
                    className={`${styles.tabLink} ${apiMode === 'custom' ? styles.tabLinkActive : ''}`}
                >
                    Custom APIs
                </button>
            </div>

            {apiMode === 'our' ? (
                <form id="ourModelsForm" action={ourConfig ? editFormAction : addFormAction} className={styles.apiForm}>
                    <input type="hidden" name="configName" value="Our Model" />
                    <input type="hidden" name="apiUrl" value="/api/v1" />
                    <input type="hidden" name="apiKey" value="internal" />
                    {ourConfig && <input type="hidden" name="configId" value={ourConfig.id} />}

                    <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', color: '#eab308', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
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
                                    (document.getElementById("ourModelsForm") as HTMLFormElement)?.requestSubmit();
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
                                    (document.getElementById("ourModelsForm") as HTMLFormElement)?.requestSubmit();
                                }, 0);
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button 
                            type="button" 
                            onClick={handleTestConnection} 
                            className={styles.primaryBtn} 
                            style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: isTestingConnection ? 'var(--bg-tertiary)' : 'var(--accent-primary)', color: isTestingConnection ? 'var(--text-secondary)' : '#fff', fontWeight: 600, border: 'none', borderRadius: 'var(--radius-md)', cursor: isTestingConnection ? 'not-allowed' : 'pointer' }}
                            disabled={isTestingConnection}
                        >
                            {isTestingConnection ? <><Loader2 className="animate-spin" size={18} /> Testing Connection...</> : <><Zap size={18} fill="currentColor" /> Test AI Connection</>}
                        </button>
                    </div>
                </form>
            ) : (
                <div className={styles.customApiSection}>
                    {!isAddingCustom ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>Saved Configurations</h3>
                                <button onClick={() => setIsAddingCustom(true)} className={styles.primaryBtn} style={{ padding: '0.5rem', borderRadius: '50%' }}>
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className={styles.apiList}>
                                {customConfigs.length > 0 ? (
                                    customConfigs.map(api => (
                                        <div key={api.id} className={styles.apiCard} style={api.isDefault ? { borderColor: 'var(--accent-primary)', cursor: 'pointer' } : { cursor: 'pointer' }} onClick={() => handleSetDefault(api.id)}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    {api.isDefault ? <CheckCircle size={20} style={{ color: 'var(--accent-primary)' }} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-color)' }} />}
                                                    <div>
                                                        <h4 style={{ margin: 0 }}>{api.configName}</h4>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{api.modelName}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => startEdit(api)} className={styles.iconBtn}><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(api.id)} className={styles.iconBtn} disabled={deletingId === api.id} style={{ color: '#ef4444' }}>
                                                        {deletingId === api.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '2rem 0' }}>No custom APIs configured.</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <form action={editingConfig ? editFormAction : addFormAction} className={styles.apiForm} style={{ border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>{editingConfig ? 'Edit Custom API' : 'Add Custom API'}</h3>
                                <button type="button" onClick={resetForm} className={styles.iconBtn}><X size={20} /></button>
                            </div>
                            {editingConfig && <input type="hidden" name="configId" value={editingConfig.id} />}

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Config Name</label>
                                <input name="configName" defaultValue={editingConfig?.configName} className={styles.input} placeholder="e.g. OpenRouter" required />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>API URL</label>
                                <input name="apiUrl" value={tempApiUrl} onChange={e => setTempApiUrl(e.target.value)} className={styles.input} placeholder="https://api.openai.com/v1" required />
                                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                    {endpointSuffixes.map(s => <button key={s} type="button" onClick={() => handleAppendEndpoint(s)} className={styles.apiBadge} style={{ cursor: 'pointer', border: '1px solid var(--border-light)', background: 'none' }}>{s}</button>)}
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>API Key {editingConfig && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(Blank to keep)</span>}</label>
                                <input name="apiKey" type="password" value={tempApiKey} onChange={e => setTempApiKey(e.target.value)} className={styles.input} placeholder="sk-..." required={!editingConfig} />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Model Name</label>
                                <input name="modelName" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className={styles.input} placeholder="gpt-4o" required />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button 
                                    type="button" 
                                    onClick={handleTestConnection} 
                                    className={styles.secondaryBtn} 
                                    style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: isTestingConnection ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', color: isTestingConnection ? 'var(--text-secondary)' : 'var(--text-primary)', border: '1px solid var(--border-light)' }} 
                                    disabled={isTestingConnection}
                                >
                                    {isTestingConnection ? <><Loader2 className="animate-spin" size={18} /> Testing...</> : <><Zap size={18} fill="currentColor" /> Test AI Integration</>}
                                </button>
                                <button type="submit" className={styles.saveButton} style={{ marginTop: 0, flex: 2 }} disabled={isAddPending || isEditPending}>
                                    {(isAddPending || isEditPending) ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} /> {editingConfig ? 'Update Config' : 'Save Config'}</>}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
function ThemeTab() {
    return (
        <div className={styles.formPanel}>
            <h2 className={styles.panelTitle}>Theme Settings</h2>

            <div className={styles.toggleGroup}>
                <div>
                    <h3 className={styles.toggleTitle}>Application Theme</h3>
                    <p className={styles.toggleDesc}>Switch between light and dark mode for a better aesthetic experience.</p>
                </div>
                <ThemeSwitcher />
            </div>
        </div>
    );
}
