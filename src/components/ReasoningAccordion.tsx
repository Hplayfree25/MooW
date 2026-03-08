"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Sparkles, ChevronDown, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import styles from '@/app/(chat)/chat.module.css';

interface ReasoningAccordionProps {
    reasoning: string;
    sanitizeSchema: any;
    resolver: (text: string) => string;
    isStreaming?: boolean;
}

export function ReasoningAccordion({ reasoning, sanitizeSchema, resolver, isStreaming = false }: ReasoningAccordionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const showExpanded = isExpanded;

    return (
        <motion.div
            className={styles.reasoningContainer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
            <button
                className={styles.reasoningHeader}
                onClick={() => setIsExpanded(!isExpanded)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatePresence mode="popLayout">
                        {isStreaming ? (
                            <motion.div
                                key="streaming"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                className={styles.animatedSparkles}
                            >
                                <Sparkles size={14} color="var(--primary-color, #8b5cf6)" />
                            </motion.div>
                        ) : showExpanded || isHovered ? (
                            <motion.div
                                key="sparkles"
                                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            >
                                <Sparkles size={14} color="var(--primary-color, #8b5cf6)" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="help"
                                initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            >
                                <HelpCircle size={14} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <span style={{ flex: 1 }}>
                    {isStreaming ? 'Thinking...' : 'Reasoning process'}
                </span>

                <motion.div
                    animate={{ rotate: showExpanded ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    <ChevronDown size={14} />
                </motion.div>
            </button>

            <AnimatePresence>
                {showExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className={styles.reasoningContent}>
                            <ReactMarkdown
                                remarkPlugins={[remarkBreaks]}
                                rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]] as any}
                                components={{
                                    p: ({ node, children }) => <p>{children}</p>
                                }}
                            >
                                {resolver(reasoning).replace(/"([^"]*)"/g, '<span style="color: var(--chat-dialog); font-weight: 500;">"$1"</span>')}
                            </ReactMarkdown>
                            {isStreaming && (
                                <motion.span
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ display: 'inline-block', color: 'var(--primary-color, #8b5cf6)' }}
                                >
                                    ▍
                                </motion.span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
