"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { Mark, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import ImageResize from 'tiptap-extension-resize-image';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
import { useState, useRef, useEffect } from 'react';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import { MediaLibraryModal } from './MediaLibraryModal';
import {
    Bold, Italic, Underline as UnderlineIcon, Highlighter,
    Strikethrough, Heading1, Heading2, Heading3, TextQuote,
    List, ListOrdered, Link2, Unlink, Image as ImageIcon,
    AlignLeft, AlignCenter, AlignRight, Quote, EyeOff, Code, Braces,
    RotateCcw, Palette, Type as TypeIcon
} from 'lucide-react';
import styles from './RichTextEditor.module.css';
import { motion, AnimatePresence } from 'framer-motion';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        setSpoiler: () => ReturnType,
        toggleSpoiler: () => ReturnType,
        unsetSpoiler: () => ReturnType,
    }
}

const CustomParagraph = Paragraph.extend({
    addStorage() {
        return {
            markdown: {
                serialize(state: any, node: any) {
                    const align = node.attrs.textAlign;
                    if (align && align !== 'left') {
                        state.write(`<div align="${align}">\n\n`);
                    }
                    state.renderInline(node);
                    state.closeBlock(node);
                    state.write('\n\n');
                    if (align && align !== 'left') {
                        state.write(`</div>\n\n`);
                    }
                },
                parse: {
                    setup(markdownit: any) {
                        markdownit.block.ruler.before('paragraph', 'aligned_paragraph', (state: any, startLine: any, endLine: any, silent: any) => {
                            return false;
                        });
                    }
                }
            }
        };
    }
});

const CustomHeading = Heading.extend({
    addStorage() {
        return {
            markdown: {
                serialize(state: any, node: any) {
                    const align = node.attrs.textAlign;
                    if (align && align !== 'left') {
                        state.write(`<div align="${align}">\n\n`);
                    }
                    state.write(state.repeat('#', node.attrs.level) + ' ');
                    state.renderInline(node);
                    state.closeBlock(node);
                    state.write('\n\n');
                    if (align && align !== 'left') {
                        state.write(`</div>\n\n`);
                    }
                }
            }
        };
    }
});



const Spoiler = Mark.create({
    name: 'spoiler',
    parseHTML() {
        return [{ tag: 'span[data-spoiler]' }];
    },
    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-spoiler': '', class: 'spoiler-mark' }), 0];
    },
    addCommands(): any {
        return {
            setSpoiler: () => ({ commands }: any) => commands.setMark(this.name),
            toggleSpoiler: () => ({ commands }: any) => commands.toggleMark(this.name),
            unsetSpoiler: () => ({ commands }: any) => commands.unsetMark(this.name),
        };
    },
    addStorage() {
        return {
            markdown: {
                serialize: {
                    open: '<span data-spoiler class="spoiler-mark">',
                    close: '</span>',
                    mixable: true,
                    expelEnclosingWhitespace: true,
                }
            }
        };
    }
});

function Popover({ isOpen, onClose, anchorRef, children }: any) {
    if (!isOpen) return null;
    return (
        <div className={styles.popoverOverlay} onClick={onClose}>
            <div
                className={styles.popoverContent}
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'absolute',
                    top: anchorRef.current?.getBoundingClientRect().bottom + window.scrollY + 8,
                    left: anchorRef.current?.getBoundingClientRect().left + window.scrollX,
                }}
            >
                {children}
            </div>
        </div>
    );
}

export function RichTextEditor({ defaultValue = "", content, name, onChange, variant = "default", readOnly = false }: { defaultValue?: string, content?: string, name: string, onChange?: (str: string) => void, variant?: "default" | "simple", readOnly?: boolean }) {
    const [viewMode, setViewMode] = useState<"visual" | "markdown">("visual");
    const [markdownContent, setMarkdownContent] = useState(content || defaultValue);
    const [isLinkOpen, setIsLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const linkBtnRef = useRef<HTMLButtonElement>(null);
    const [isHeadingsOpen, setIsHeadingsOpen] = useState(false);
    const headBtnRef = useRef<HTMLButtonElement>(null);
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const [isColorOpen, setIsColorOpen] = useState(false);
    const colorBtnRef = useRef<HTMLButtonElement>(null);
    const [isHighlightOpen, setIsHighlightOpen] = useState(false);
    const highlightBtnRef = useRef<HTMLButtonElement>(null);
    const [activeMarks, setActiveMarks] = useState<Record<string, boolean>>({});
    const [toolbarColor, setToolbarColor] = useState('#000000');
    const [highlightColor, setHighlightColor] = useState('#ffff00');
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const syncToolbar = (ed: any) => {
        setActiveMarks({
            bold: ed.isActive('bold'),
            italic: ed.isActive('italic'),
            underline: ed.isActive('underline'),
            strike: ed.isActive('strike'),
            code: ed.isActive('code'),
            heading: ed.isActive('heading'),
            h1: ed.isActive('heading', { level: 1 }),
            h2: ed.isActive('heading', { level: 2 }),
            h3: ed.isActive('heading', { level: 3 }),
            paragraph: ed.isActive('paragraph'),
            textStyle: ed.isActive('textStyle'),
            highlight: ed.isActive('highlight'),
            alignLeft: ed.isActive({ textAlign: 'left' }),
            alignCenter: ed.isActive({ textAlign: 'center' }),
            alignRight: ed.isActive({ textAlign: 'right' }),
            bulletList: ed.isActive('bulletList'),
            orderedList: ed.isActive('orderedList'),
            blockquote: ed.isActive('blockquote'),
            spoiler: ed.isActive('spoiler'),
            codeBlock: ed.isActive('codeBlock'),
            link: ed.isActive('link'),
        });
        if (ed.isActive('textStyle')) {
            setToolbarColor(ed.getAttributes('textStyle').color || '#000000');
        } else {
            setToolbarColor('#000000');
        }
    };

    const editor = useEditor({
        editable: !readOnly,
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                paragraph: false,
                heading: false,
                link: false,
                underline: false,
            }),
            CustomParagraph,
            CustomHeading,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Underline,
            ImageResize,
            Spoiler,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false }),
            Markdown.configure({ html: true, transformPastedText: true, transformCopiedText: true }),
        ],
        content: content || defaultValue,
        onUpdate: ({ editor }: any) => {
            syncToolbar(editor);
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = setTimeout(() => {
                const md = (editor.storage as any).markdown.getMarkdown();
                setMarkdownContent(md);
                if (onChange) onChange(md);
            }, 300);
        },
        onTransaction: ({ editor }: any) => {
            syncToolbar(editor);
        },
        onSelectionUpdate: ({ editor }: any) => {
            syncToolbar(editor);
        },
        onFocus: ({ editor }: any) => {
            syncToolbar(editor);
        },
        onBlur: ({ editor }: any) => {
            syncToolbar(editor);
        },
    });

    useEffect(() => {
        if (viewMode === "visual" && editor && markdownContent !== (editor.storage as any).markdown.getMarkdown()) {
            editor.commands.setContent(markdownContent);
        }
    }, [viewMode, editor, markdownContent]);

    useEffect(() => {
        if (editor && content !== undefined) {
            const currentMd = (editor.storage as any).markdown.getMarkdown();
            if (content !== currentMd && content !== markdownContent) {
                editor.commands.setContent(content);
                setMarkdownContent(content);
            }
        }
    }, [content, editor]);

    useEffect(() => {
        return () => {
            if (editor) editor.destroy();
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        };
    }, [editor]);

    if (!editor) return null;

    const toggleLink = () => {
        setLinkUrl(editor.getAttributes('link').href || "");
        setIsLinkOpen(true);
    };

    const applyLink = () => {
        if (linkUrl && editor.schema.marks.link) {
            const { from, to } = editor.state.selection;
            if (from !== to) {
                editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
            } else {
                editor.chain().focus().run();
                const linkMark = editor.schema.marks.link.create({ href: linkUrl });
                editor.view.dispatch(editor.state.tr.addStoredMark(linkMark));
            }
        }
        setIsLinkOpen(false);
    };

    const unlinkCursor = () => {
        if (editor.schema.marks.link) {
            editor.view.dispatch(editor.state.tr.removeStoredMark(editor.schema.marks.link));
        }
        editor.chain().focus().run();
        syncToolbar(editor);
    };

    return (
        <div className={`${styles.editorContainer} ${readOnly ? styles.readOnly : ''}`}>
            <input type="hidden" name={name} value={markdownContent} />

            {!readOnly && (
                <div className={styles.toolbar} onMouseDown={e => e.preventDefault()}>
                    {/* Kepala dari toolbar */}
                    {variant !== "simple" && (
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                ref={headBtnRef}
                                onClick={() => setIsHeadingsOpen(!isHeadingsOpen)}
                                className={`${styles.iconBtn} ${(activeMarks.heading || activeMarks.paragraph) ? styles.active : ''}`}
                                title="Format"
                            >
                                {activeMarks.h1 ? <Heading1 size={16} /> :
                                    activeMarks.h2 ? <Heading2 size={16} /> :
                                        activeMarks.h3 ? <Heading3 size={16} /> :
                                            <TextQuote size={16} />}
                            </button>
                            <Popover isOpen={isHeadingsOpen} onClose={() => setIsHeadingsOpen(false)} anchorRef={headBtnRef}>
                                <div className={styles.dropdownMenu}>
                                    <button type="button" onClick={() => { editor.chain().focus().setParagraph().run(); setIsHeadingsOpen(false); }} className={styles.headingItem}>Paragraph</button>
                                    <button type="button" onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setIsHeadingsOpen(false); }} className={styles.headingItem}><h1>Heading 1</h1></button>
                                    <button type="button" onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setIsHeadingsOpen(false); }} className={styles.headingItem}><h2>Heading 2</h2></button>
                                    <button type="button" onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setIsHeadingsOpen(false); }} className={styles.headingItem}><h3>Heading 3</h3></button>
                                </div>
                            </Popover>
                        </div>
                    )}

                    <div className={styles.divider} />

                    {/* Ini tuh text formating cok */}
                    <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`${styles.iconBtn} ${activeMarks.bold ? styles.active : ''}`} title="Bold"><Bold size={16} /></button>
                    <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${styles.iconBtn} ${activeMarks.italic ? styles.active : ''}`} title="Italic"><Italic size={16} /></button>
                    <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${styles.iconBtn} ${activeMarks.underline ? styles.active : ''}`} title="Underline"><UnderlineIcon size={16} /></button>
                    <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`${styles.iconBtn} ${activeMarks.strike ? styles.active : ''}`} title="Strikethrough"><Strikethrough size={16} /></button>
                    <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={`${styles.iconBtn} ${activeMarks.code ? styles.active : ''}`} title="Inline Code"><Code size={16} /></button>

                    {variant !== "simple" && (
                        <>
                            <div style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    ref={colorBtnRef}
                                    onClick={() => setIsColorOpen(!isColorOpen)}
                                    className={`${styles.iconBtn} ${activeMarks.textStyle ? styles.active : ''}`}
                                    title="Text Color"
                                >
                                    <TypeIcon size={16} />
                                    <span className={styles.colorBar} style={{ backgroundColor: toolbarColor }} />
                                </button>
                                <Popover isOpen={isColorOpen} onClose={() => setIsColorOpen(false)} anchorRef={colorBtnRef}>
                                    <div className={styles.colorPopover}>
                                        <input
                                            type="color"
                                            onInput={(e) => {
                                                const val = (e.target as HTMLInputElement).value;
                                                setToolbarColor(val);
                                                editor.chain().setColor(val).run();
                                            }}
                                            onChange={(e) => {
                                                const val = (e.target as HTMLInputElement).value;
                                                setToolbarColor(val);
                                                editor.chain().focus().setColor(val).run();
                                            }}
                                            value={toolbarColor}
                                            className={styles.colorPopoverInput}
                                        />
                                        <button
                                            type="button"
                                            className={styles.resetBtn}
                                            onClick={() => {
                                                editor.chain().focus().unsetColor().run();
                                                setToolbarColor('#000000');
                                                setIsColorOpen(false);
                                            }}
                                        >
                                            Reset <RotateCcw size={14} />
                                        </button>
                                    </div>
                                </Popover>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    ref={highlightBtnRef}
                                    onClick={() => setIsHighlightOpen(!isHighlightOpen)}
                                    className={`${styles.iconBtn} ${activeMarks.highlight ? styles.active : ''}`}
                                    title="Highlight"
                                >
                                    <Highlighter size={16} />
                                    <span className={styles.colorBar} style={{ backgroundColor: highlightColor }} />
                                </button>
                                <Popover isOpen={isHighlightOpen} onClose={() => setIsHighlightOpen(false)} anchorRef={highlightBtnRef}>
                                    <div className={styles.colorPopover}>
                                        <input
                                            type="color"
                                            onInput={(e) => {
                                                const val = (e.target as HTMLInputElement).value;
                                                setHighlightColor(val);
                                                editor.chain().setHighlight({ color: val }).run();
                                            }}
                                            onChange={(e) => {
                                                const val = (e.target as HTMLInputElement).value;
                                                setHighlightColor(val);
                                                editor.chain().focus().setHighlight({ color: val }).run();
                                            }}
                                            value={highlightColor}
                                            className={styles.colorPopoverInput}
                                        />
                                        <button
                                            type="button"
                                            className={styles.resetBtn}
                                            onClick={() => {
                                                editor.chain().focus().unsetHighlight().run();
                                                setHighlightColor('#ffff00');
                                                setIsHighlightOpen(false);
                                            }}
                                        >
                                            Reset <RotateCcw size={14} />
                                        </button>
                                    </div>
                                </Popover>
                            </div>

                            <div className={styles.divider} />

                            <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`${styles.iconBtn} ${(activeMarks.alignLeft || (!activeMarks.alignCenter && !activeMarks.alignRight)) ? styles.active : ''}`} title="Align Left"><AlignLeft size={16} /></button>
                            <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`${styles.iconBtn} ${activeMarks.alignCenter ? styles.active : ''}`} title="Align Center"><AlignCenter size={16} /></button>
                            <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`${styles.iconBtn} ${activeMarks.alignRight ? styles.active : ''}`} title="Align Right"><AlignRight size={16} /></button>

                            <div className={styles.divider} />
                        </>
                    )}

                    {variant !== "simple" && (
                        <>
                            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${styles.iconBtn} ${activeMarks.bulletList ? styles.active : ''}`} title="Bullet List"><List size={16} /></button>
                            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${styles.iconBtn} ${activeMarks.orderedList ? styles.active : ''}`} title="Numbered List"><ListOrdered size={16} /></button>
                            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`${styles.iconBtn} ${activeMarks.blockquote ? styles.active : ''}`} title="Quote"><Quote size={16} /></button>
                        </>
                    )}

                    <button type="button" onClick={() => (editor.chain().focus() as any).toggleSpoiler().run()} className={`${styles.iconBtn} ${activeMarks.spoiler ? styles.active : ''}`} title="Spoiler"><EyeOff size={16} /></button>
                    <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`${styles.iconBtn} ${activeMarks.codeBlock ? styles.active : ''}`} title="Code Block"><Braces size={16} /></button>

                    {variant !== "simple" && <div className={styles.divider} />}

                    <button type="button" ref={linkBtnRef} onClick={toggleLink} className={`${styles.iconBtn} ${activeMarks.link ? styles.active : ''}`} title="Link"><Link2 size={16} /></button>
                    <Popover isOpen={isLinkOpen} onClose={() => setIsLinkOpen(false)} anchorRef={linkBtnRef}>
                        <div className={styles.linkPopover}>
                            <input type="url" placeholder="Enter URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} autoFocus className={styles.linkInput} />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={applyLink} className={styles.primaryBtn} style={{ flex: 1 }}>Set Link</button>
                                <button
                                    type="button"
                                    onClick={() => { unlinkCursor(); setIsLinkOpen(false); }}
                                    className={styles.primaryBtn}
                                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                    title="Unlink"
                                >
                                    <Unlink size={16} />
                                </button>
                            </div>
                        </div>
                    </Popover>

                    {variant !== "simple" && (
                        <button type="button" onClick={() => setIsMediaOpen(true)} className={styles.iconBtn} title="Insert Image"><ImageIcon size={16} /></button>
                    )}

                    <div style={{ flexGrow: 1 }} />

                    <button
                        type="button"
                        onClick={() => setViewMode(viewMode === "visual" ? "markdown" : "visual")}
                        className={`${styles.viewToggleBtn} ${viewMode === 'markdown' ? styles.activeMode : ''}`}
                        title="View Source (Markdown)"
                    >
                        <Code size={16} /> <span>{viewMode === "visual" ? "Source" : "Visual"}</span>
                    </button>
                </div>
            )}

            <div className={styles.editorBody}>
                {viewMode === "visual" ? (
                    <EditorContent editor={editor} className={styles.tiptapEditor} />
                ) : (
                    <textarea
                        className={styles.markdownSource}
                        value={markdownContent}
                        onChange={(e) => {
                            setMarkdownContent(e.target.value);
                            if (onChange) onChange(e.target.value);
                        }}
                    />
                )}
            </div>

            {!readOnly && (
                <MediaLibraryModal
                    isOpen={isMediaOpen}
                    onClose={() => setIsMediaOpen(false)}
                    onSelect={(url) => {
                        editor.chain().focus().insertContent(`<img src="${url}" width="300" />`).run();
                        setIsMediaOpen(false);
                    }}
                />
            )}
        </div>
    );
}
