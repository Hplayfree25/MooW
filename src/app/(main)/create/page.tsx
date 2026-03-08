"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Sparkles, Upload, FileJson, Info, Maximize2, Bold, Italic, Link2, ImageIcon, List, Eye, X, Loader2 } from "lucide-react";
import styles from "./create.module.css";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import { createCharacterAction } from "../actions";
import { extractCharaDataFromPNG } from "@/lib/pngParser";
import { ErrorModal } from "@/components/ErrorModal";
import { RichTextEditor } from "@/components/RichTextEditor";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

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

export default function CreateCharacterPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showImportSuccess, setShowImportSuccess] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const [tagInput, setTagInput] = useState("");
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    const [formData, setFormData] = useState({
        imageUrl: "",
        characterName: "",
        characterChatName: "",
        characterBio: "",
        creatorNotes: "",
        tags: [] as string[],
        publishSettings: "Public",
        contentRating: "Limited",
        personality: "",
        scenario: "",
        exampleDialogue: "",
    });

    const [firstMessages, setFirstMessages] = useState<string[]>([""]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddMessage = () => {
        setFirstMessages(prev => [...prev, ""]);
    };

    const handleMessageChange = (index: number, value: string) => {
        const newMessages = [...firstMessages];
        newMessages[index] = value;
        setFirstMessages(newMessages);
    };

    const handleRemoveMessage = (index: number) => {
        const newMessages = firstMessages.filter((_, i) => i !== index);
        setFirstMessages(newMessages);
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === ' ' || e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            const newTag = tagInput.trim().replace(/,/g, '');
            if (newTag) {
                const currentTags = formData.tags;
                if (!currentTags.includes(newTag)) {
                    setFormData(prev => ({ ...prev, tags: [...currentTags, newTag] }));
                }
            }
            setTagInput('');
        } else if (e.key === 'Backspace' && tagInput === '') {
            const currentTags = formData.tags;
            currentTags.pop();
            setFormData(prev => ({ ...prev, tags: currentTags }));
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const currentTags = formData.tags;
        setFormData(prev => ({ ...prev, tags: currentTags.filter(t => t !== tagToRemove) }));
    };



    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            let imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const finishCrop = async () => {
        setIsUploadingImage(true);
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc!, croppedAreaPixels!);
            const base64 = await readFile(croppedImageBlob as File);

            setFormData(prev => ({ ...prev, imageUrl: base64 }));
            setImageSrc(null);
        } catch (e) {
            console.error(e);
            alert("Error processing crop.");
        } finally {
            setIsUploadingImage(false);
        }
    };

    const readFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result as string), false);
            reader.readAsDataURL(file);
        });
    };

    const handleSpecImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            let jsonString = "";
            let parsedAvatar = "";

            if (file.type === "image/png" || file.name.endsWith(".png")) {
                const buffer = await file.arrayBuffer();
                const base64Data = extractCharaDataFromPNG(buffer);
                if (!base64Data) throw new Error("No embedded character data found in this PNG.");
                jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
                parsedAvatar = await readFile(file);
            } else {
                jsonString = await file.text();
            }

            const jsonObject = JSON.parse(jsonString);
            const data = jsonObject.data || jsonObject;

            const spec = data.data || data;
            const newTags = Array.isArray(spec.tags) ? spec.tags : [];
            setFormData(prev => ({
                ...prev,
                imageUrl: parsedAvatar || prev.imageUrl,
                characterName: spec.name || "",
                characterChatName: spec.name || "",
                characterBio: "",
                creatorNotes: spec.creator_notes || "",
                personality: spec.description || "",
                scenario: spec.scenario || "",
                exampleDialogue: spec.mes_example || "",
                tags: newTags,
                contentRating: newTags.map((t: string) => t.toLowerCase()).includes('nsfw') ? "Limitless" : "Limited"
            }));

            if (data.first_mes) {
                setFirstMessages([data.first_mes]);
            } else if (data.alternate_greetings && data.alternate_greetings.length > 0) {
                setFirstMessages(data.alternate_greetings);
            }

            setShowImportSuccess(true);
            setTimeout(() => setShowImportSuccess(false), 2500);

            if (jsonInputRef.current) jsonInputRef.current.value = '';
        } catch (err) {
            console.error("Import error:", err);
            alert("Failed to read Character Spec. Ensure the PNG/JSON contains valid V2 data.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const tagsArray = formData.tags.filter((t: string) => t.trim().length >= 3);

        const submissionData = {
            ...formData,
            tags: tagsArray,
            firstMessages: firstMessages.filter((m: string) => m.trim() !== ""),
        };

        const result = await createCharacterAction(submissionData);
        if (result.success) {
            router.push("/");
        } else {
            setErrorMessage(result.error || "Internal Server Error occurred while trying to save to Database. Please try again later.");
            setShowErrorModal(true);
            setIsSubmitting(false);
        }
    };

    const previewAvatarStyle = formData.imageUrl
        ? { backgroundImage: `url(${formData.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
        : { backgroundImage: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' };

    const PreviewCard = () => (
        <div className={styles.previewCardInner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '4rem', height: '4rem', borderRadius: 'var(--radius-xl)', flexShrink: 0, ...previewAvatarStyle }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formData.characterName || "New Character"}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>@you</div>
                </div>
            </div>
            <div className={styles.previewBioText} style={{ minHeight: '3rem' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}>
                    {formData.characterBio || formData.creatorNotes || "The bio will appear here in the Explore grid preview."}
                </ReactMarkdown>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {formData.tags.filter((t: string) => t.trim().length > 0).slice(0, 3).map((tag: string) => (
                    <span key={tag} style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 500 }}>
                        {tag.trim()}
                    </span>
                ))}
                {!formData.tags && <span style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: 500 }}>Tags...</span>}
            </div>
            <button style={{ width: '100%', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', fontWeight: 600, fontSize: '0.875rem', cursor: 'not-allowed', marginTop: '0.5rem' }}>
                Chat
            </button>
        </div>
    );

    return (
        <div className={styles.createContainer}>

            <svg style={{ display: 'none' }}>
                <symbol id="success-check" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="160" strokeDashoffset="160" style={{ animation: 'drawCircle 0.5s ease-out forwards' }} />
                    <path d="M14 27 l8 8 l16 -16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="50" strokeDashoffset="50" style={{ animation: 'drawCheck 0.4s ease-out forwards 0.4s' }} />
                </symbol>
            </svg>
            <style jsx>{`
                @keyframes drawCircle { 
                    to { stroke-dashoffset: 0; } 
                }
                @keyframes drawCheck { 
                    to { stroke-dashoffset: 0; } 
                }
                @keyframes popIn {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>

            {showImportSuccess && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '2rem 3rem', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-light)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', animation: 'popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <svg style={{ width: '4rem', height: '4rem', color: '#10b981' }}>
                            <use href="#success-check" />
                        </svg>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Import Successful</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Character data extracted.</p>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {imageSrc && (
                    <div className={styles.cropModalOverlay}>
                        <motion.div
                            className={styles.modalContent}
                            style={{ maxWidth: '600px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', width: '100%' }}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Crop the Image</h3>
                                <button onClick={() => setImageSrc(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <div style={{ position: 'relative', height: '400px', width: '100%', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
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
                                    <button onClick={() => setImageSrc(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                                    <button onClick={finishCrop} style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={isUploadingImage}>
                                        {isUploadingImage ? <Loader2 className="animate-spin" size={16} /> : "Save Avatar"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            <button className={styles.mobilePreviewFab} onClick={() => setShowMobilePreview(!showMobilePreview)}>
                <Eye size={20} />
            </button>

            {showMobilePreview && (
                <div className={styles.cropModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowMobilePreview(false); }}>
                    <div className={styles.mobilePreviewContent}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Live Preview</h3>
                            <button type="button" onClick={() => setShowMobilePreview(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <PreviewCard />
                    </div>
                </div>
            )}

            <div className={styles.createHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Create Character</h1>
                    <p className={styles.subtitle}>Bring your new AI companion to life with detailed traits.</p>
                </div>
                <div className={styles.headerActions}>
                    <input
                        type="file"
                        accept=".json,.png,image/png"
                        className={styles.hiddenInput}
                        ref={jsonInputRef}
                        onChange={handleSpecImport}
                    />
                    <button type="button" className={styles.importBtn} onClick={() => jsonInputRef.current?.click()}>
                        <FileJson size={18} /> Import JSON / PNG
                    </button>
                </div>
            </div>

            <div className={styles.pageLayout}>
                <div className={styles.formArea}>
                    <form onSubmit={handleSubmit} id="characterForm">
                        <div className={styles.formGrid}>

                            <div className={styles.formSection}>
                                <h2 className={styles.sectionTitle}>Identity</h2>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Avatar</label>
                                    <div className={styles.uploadArea}>
                                        <div className={styles.avatarPreview} style={previewAvatarStyle}>
                                            {!formData.imageUrl && "No Image"}
                                        </div>
                                        <div>
                                            <input
                                                type="file"
                                                accept="image/jpeg, image/png, image/webp"
                                                className={styles.hiddenInput}
                                                ref={fileInputRef}
                                                onChange={onFileChange}
                                            />
                                            <button type="button" className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                                                <Upload size={16} style={{ marginRight: '8px' }} /> Select Image
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Character Name</label>
                                    <input type="text" name="characterName" value={formData.characterName} onChange={handleChange} className={styles.input} placeholder="e.g. Luna The Familiar" required />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Chat Name</label>
                                    <input type="text" name="characterChatName" value={formData.characterChatName} onChange={handleChange} className={styles.input} placeholder="e.g. Luna" />
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <h2 className={styles.sectionTitle}>Discovery</h2>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Short Bio</label>
                                    <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                        <RichTextEditor
                                            name="characterBio"
                                            variant="simple"
                                            content={formData.characterBio}
                                            defaultValue={formData.characterBio}
                                            onChange={(val) => setFormData(prev => ({ ...prev, characterBio: val }))}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Tags</label>
                                    <div className={styles.tagsContainer}>
                                        {formData.tags.filter((t: string) => t.trim() !== "").map((tag: string) => (
                                            <span key={tag} className={styles.tagChip}>
                                                {tag}
                                                <button type="button" onClick={() => handleRemoveTag(tag)} className={styles.tagRemoveBtn}>
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                            className={styles.tagInput}
                                            placeholder={formData.tags.length > 0 ? "" : "Fantasy, Romance (Space to add)"}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Publish Settings</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, publishSettings: "Public" }))}
                                            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: formData.publishSettings === 'Public' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', backgroundColor: formData.publishSettings === 'Public' ? 'var(--accent-light)' : 'transparent', color: formData.publishSettings === 'Public' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            Public
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, publishSettings: "Private" }))}
                                            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: formData.publishSettings === 'Private' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', backgroundColor: formData.publishSettings === 'Private' ? 'var(--accent-light)' : 'transparent', color: formData.publishSettings === 'Private' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            Private
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Content Rating</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, contentRating: "Limitless" }))}
                                            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: formData.contentRating === 'Limitless' ? '2px solid #ef4444' : '1px solid var(--border-light)', backgroundColor: formData.contentRating === 'Limitless' ? '#fef2f2' : 'transparent', color: formData.contentRating === 'Limitless' ? '#ef4444' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            Limitless
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, contentRating: "Limited" }))}
                                            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: formData.contentRating === 'Limited' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', backgroundColor: formData.contentRating === 'Limited' ? 'var(--accent-light)' : 'transparent', color: formData.contentRating === 'Limited' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            Limited
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSectionFull}>
                                <h2 className={styles.sectionTitle}>Creator's Notes</h2>
                                <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                                    <label className={styles.label}>Notes (Supports Markdown)</label>
                                    <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                        <RichTextEditor
                                            name="creatorNotes"
                                            content={formData.creatorNotes}
                                            defaultValue={formData.creatorNotes}
                                            onChange={(val) => setFormData(prev => ({ ...prev, creatorNotes: val }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSectionFull}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h2 className={styles.sectionTitle} style={{ marginBottom: 0, borderBottom: 'none' }}>Definition & Persona</h2>
                                    <button type="button" onClick={() => setShowGuide(!showGuide)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                        <Info size={16} /> Guidelines
                                    </button>
                                </div>

                                {showGuide && (
                                    <div style={{ backgroundColor: 'var(--accent-light)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', color: 'var(--accent-primary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Character Creation Masterclass (Beginner Friendly)</h4>
                                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Creating a responsive AI requires detailed and vivid descriptions. Follow this structured blueprint for best results:</p>

                                        <strong style={{ display: 'block', marginTop: '1rem', color: 'var(--text-primary)' }}>1. Personality (Traits & Behavior)</strong>
                                        <p style={{ marginBottom: '0.5rem', marginLeft: '1rem', color: 'var(--text-secondary)' }}>This sets the core identity. Describe their backstory, physical traits, motivations, and the way they speak. Use plain English paragraphs or direct lists. <br /><em>Example: "Traits: cunning, brilliant, secretive. Appearance: tall with cybernetic eyes."</em> The more detail, the more alive they feel.</p>

                                        <strong style={{ display: 'block', marginTop: '1rem', color: 'var(--text-primary)' }}>2. Scenario & Context (The Setup)</strong>
                                        <p style={{ marginBottom: '0.5rem', marginLeft: '1rem', color: 'var(--text-secondary)' }}>Establish <strong>where</strong> the conversation occurs and <strong>what</strong> is happening right now. <br /><em>Example: "The character and User are trapped inside a malfunctioning space station elevator with life support failing."</em> This immediately grounds the AI's first response.</p>

                                        <strong style={{ display: 'block', marginTop: '1rem', color: 'var(--text-primary)' }}>3. Example Dialogue (CRITICAL)</strong>
                                        <p style={{ marginBottom: '0.5rem', marginLeft: '1rem', color: 'var(--text-secondary)' }}>
                                            This is how you teach the AI how to format replies and emulate speech patterns. Use <code>{'{{user}}'}</code> placeholder for yourself and <code>{'{{char}}'}</code> for the AI.<br /><br />
                                            <strong>Proper Formatting Example:</strong><br />
                                            <code style={{ display: 'block', backgroundColor: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{'{{user}}'}: Hey, how are you modifying those codes so fast?<br />
                                                {'{{char}}'}: *She pauses her typing and glances over her shoulder.* "It's all about recognizing the quantum algorithms embedded in the syntax. You wouldn't grasp it right away." *She smirks and resumes working.*</code>
                                        </p>
                                    </div>
                                )}

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Personality</label>
                                    <textarea name="personality" value={formData.personality} onChange={handleChange} className={styles.textarea} placeholder="Describe their essence, backstory, and how they perceive the world..." rows={4} />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Scenario / Context</label>
                                    <textarea name="scenario" value={formData.scenario} onChange={handleChange} className={styles.textarea} placeholder="Ground the AI in a specific location or event at the start..." rows={3} />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Example Dialogue</label>
                                    <textarea name="exampleDialogue" value={formData.exampleDialogue} onChange={handleChange} className={styles.textarea} placeholder="{{user}}: Hello!\n{{char}}: *Looks up* Greetings, mortal." rows={4} />
                                </div>
                            </div>

                            <div className={styles.formSectionFull}>
                                <h2 className={styles.sectionTitle}>First Messages</h2>
                                <div className={styles.dynamicList}>
                                    {firstMessages.map((msg, index) => (
                                        <div key={index} className={styles.dynamicItem}>
                                            <textarea value={msg} onChange={(e) => handleMessageChange(index, e.target.value)} className={`${styles.textarea} ${styles.dynamicInput}`} placeholder={`Opening message ${index + 1}...`} rows={2} />
                                            {firstMessages.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveMessage(index)} className={styles.removeBtn}><Trash2 size={18} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={handleAddMessage} className={styles.addBtn}><Plus size={16} /> Add Alternative Welcome</button>
                            </div>

                        </div>

                        <div className={styles.submitWrapper}>
                            <button type="submit" form="characterForm" className={styles.submitBtn} disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : <><Sparkles size={20} /> Create Character</>}
                            </button>
                        </div>
                    </form>
                </div>

                <aside className={styles.previewSidebar}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Live Preview</h3>
                    <PreviewCard />
                </aside>
            </div>
            <ErrorModal
                isOpen={showErrorModal}
                message={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />
        </div>
    );
}
