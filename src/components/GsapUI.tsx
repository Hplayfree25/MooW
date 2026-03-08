"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface GsapSliderProps {
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (val: number) => void;
}

export function GsapSlider({ min, max, step, value, onChange }: GsapSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const updateValueFromEvent = useCallback((clientX: number) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        let percentage = (clientX - rect.left) / rect.width;
        percentage = Math.max(0, Math.min(1, percentage));

        const rawValue = min + percentage * (max - min);
        const stepMultiplier = 1 / step;
        const snappedValue = Math.round(rawValue * stepMultiplier) / stepMultiplier;
        const cleanValue = parseFloat(snappedValue.toFixed(5));

        onChange(cleanValue);
    }, [min, max, step, onChange]);

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        updateValueFromEvent(e.clientX);
        e.currentTarget.setPointerCapture(e.pointerId);

        if (thumbRef.current) {
            gsap.to(thumbRef.current, { scale: 1.2, duration: 0.2, ease: "back.out(2)" });
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging) {
            updateValueFromEvent(e.clientX);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (thumbRef.current) {
            gsap.to(thumbRef.current, { scale: 1, duration: 0.3, ease: "bounce.out" });
        }
    };

    useEffect(() => {
        if (!trackRef.current || !thumbRef.current || !progressRef.current) return;

        const percentage = ((value - min) / (max - min)) * 100;

        gsap.to(thumbRef.current, { left: `${percentage}%`, duration: isDragging ? 0.05 : 0.4, ease: "power2.out" });
        gsap.to(progressRef.current, { width: `${percentage}%`, duration: isDragging ? 0.05 : 0.4, ease: "power2.out" });
    }, [value, min, max, isDragging]);

    return (
        <div
            ref={trackRef}
            style={{
                position: 'relative',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                touchAction: 'none'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-light)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                <div ref={progressRef} style={{ position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: 'var(--accent-primary)', width: '0%' }} />
            </div>
            <div
                ref={thumbRef}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0%',
                    transform: 'translate(-50%, -50%)',
                    width: '18px',
                    height: '18px',
                    backgroundColor: 'white',
                    border: '2px solid var(--accent-primary)',
                    borderRadius: '50%',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    zIndex: 1
                }}
            />
        </div>
    );
}

interface GsapDropdownProps {
    title: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

export function GsapDropdown({ title, isOpen, onToggle, children }: GsapDropdownProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const iconRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!contentRef.current || !iconRef.current) return;

        if (isOpen) {
            gsap.to(contentRef.current, {
                height: 'auto',
                opacity: 1,
                duration: 0.4,
                ease: "power3.out"
            });
            gsap.to(iconRef.current, {
                rotation: 90,
                duration: 0.3,
                ease: "power2.out"
            });
        } else {
            gsap.to(contentRef.current, {
                height: 0,
                opacity: 0,
                duration: 0.3,
                ease: "power3.inOut"
            });
            gsap.to(iconRef.current, {
                rotation: 0,
                duration: 0.3,
                ease: "power2.out"
            });
        }
    }, [isOpen]);

    return (
        <div style={{ marginBottom: isOpen ? '1rem' : '0', transition: 'margin 0.3s ease' }}>
            <button
                onClick={onToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.75rem 0',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '1.05rem'
                }}
            >
                <div ref={iconRef} style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
                    <ChevronRight size={18} />
                </div>
                {title}
            </button>
            <div
                ref={contentRef}
                style={{
                    height: 0,
                    opacity: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    paddingLeft: '1rem',
                    borderLeft: '3px solid var(--border-light)',
                    marginLeft: '8px'
                }}
            >
                <div style={{ paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
