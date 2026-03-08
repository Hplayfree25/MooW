"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { updateProfileAction, updatePrivacyAction, updateNotificationAction, addApiAction, updateAvatarAction, deleteAvatarAction } from "./actions";
import { signOut } from "next-auth/react";
import styles from "./settings.module.css";
import { LogOut, Loader2, Save, Plus, X, User, Trash2, RefreshCw, ChevronDown, CheckCircle, Cpu } from "lucide-react";
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
                    <label htmlFor="name" className={styles.label}>Username</label>
                    <input
                        id="name" name="name" type="text"
                        defaultValue={user?.username || ""}
                        placeholder="Your display name"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="username" className={styles.label}>Name (Main Persona)</label>
                    <input
                        id="username" name="username" type="text"
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
                <input type="password" placeholder="New Password" name="newPassword" className={styles.input} />
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(addApiAction, null);
    const [models, setModels] = useState<{ id: string; name: string }[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [tempApiUrl, setTempApiUrl] = useState("");
    const [tempApiKey, setTempApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [promptProcessing, setPromptProcessing] = useState("none");
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);

    const endpointSuffixes = ["/v1", "/v1/chat/completions", "/v1/models", "/api"];
    const fetchModelsTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (state?.success) {
            toast.success("Your API set!", {
                icon: <CheckCircle className="animate-bounce" size={18} style={{ color: '#10b981' }} />,
                position: "bottom-center"
            });
            resetModal();
        } else if (state?.error) {
            toast.error(state.error);
        }
    }, [state]);

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
        if (!apiUrl || !apiKey) return;

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
        } else {
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
        if (!tempApiKey) {
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
                setTestResult(null); // Clear previous result if any
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
            const { deleteApiAction } = await import("./actions");
            await deleteApiAction(configId);
        } finally {
            setDeletingId(null);
        }
    };

    const resetModal = () => {
        setIsModalOpen(false);
        setModels([]);
        setFetchError("");
        setTempApiUrl("");
        setTempApiKey("");
        setSelectedModel("");
        setPromptProcessing("none");
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

    return (
        <div className={styles.formPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className={styles.panelTitle} style={{ margin: 0 }}>API Settings</h2>
                <button onClick={() => setIsModalOpen(true)} className={styles.primaryBtn} style={{ padding: '0.5rem', borderRadius: '50%' }}>
                    <Plus size={20} />
                </button>
            </div>

            <div className={styles.apiList}>
                {apiConfigs && apiConfigs.length > 0 ? (
                    apiConfigs.map(api => (
                        <div key={api.id} className={styles.apiCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4>{api.configName}</h4>
                                <button
                                    onClick={() => handleDelete(api.id)}
                                    className={styles.iconBtn}
                                    disabled={deletingId === api.id}
                                    title="Delete"
                                    style={{ flexShrink: 0 }}
                                >
                                    {deletingId === api.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span className={styles.apiBadge}>{api.modelName}</span>
                            </div>
                            <p className={styles.apiSecret}>••••••••••••{api.apiKey?.slice(-8) || "••••"}</p>
                        </div>
                    ))
                ) : (
                    <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>No API Configurations added yet.</p>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className={styles.modalOverlay}>
                        <motion.div
                            className={styles.modalContent}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                        >
                            <div className={styles.modalHeader}>
                                <h3>Add API Configuration</h3>
                                <button onClick={resetModal} className={styles.iconBtn}><X size={20} /></button>
                            </div>
                            <form action={formAction} className={styles.modalBody}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Configuration Name</label>
                                    <input name="configName" type="text" className={styles.input} placeholder="e.g. My OpenRouter" required />
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
                                    <label className={styles.label}>API Key</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            name="apiKey"
                                            type={showApiKey ? "text" : "password"}
                                            className={styles.input}
                                            style={{ paddingRight: '2.5rem' }}
                                            placeholder="sk-..."
                                            value={tempApiKey}
                                            onChange={(e) => setTempApiKey(e.target.value)}
                                            autoComplete="off"
                                            required
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
                                                : (!tempApiUrl || !tempApiKey)
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
                                    <textarea name="customPrompt" rows={3} className={styles.input} placeholder="Optional system prompt override..."></textarea>
                                </div>

                                <input type="hidden" name="modelList" value={JSON.stringify(models.map(m => m.id))} />

                                {testResult && !testResult.success && (
                                    <div className={`${styles.message} ${styles.error}`}>
                                        {testResult.message}
                                    </div>
                                )}

                                <div className={styles.modalFooter}>
                                    <button type="button" onClick={resetModal} className={styles.secondaryBtn}>Cancel</button>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="button" onClick={handleTestConnection} className={styles.secondaryBtn} disabled={isTestingConnection}>
                                            {isTestingConnection ? <Loader2 className="animate-spin" size={16} /> : "Test Connection"}
                                        </button>
                                        <button type="submit" className={styles.primaryBtn} disabled={isPending}>
                                            {isPending ? <Loader2 className="animate-spin" size={16} /> : "Save API"}
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
