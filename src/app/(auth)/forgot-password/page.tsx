"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import styles from "../auth.module.css";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
    const [isPending, setIsPending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsPending(true);
        setErrorMessage("");

        setTimeout(() => {
            setIsPending(false);
            setIsSuccess(true);
        }, 1500);
    };

    return (
        <div className={styles.container}>
            <div className={styles.blob1}></div>
            <div className={styles.blob2}></div>
            <div className={styles.blob3}></div>
            <div className={styles.shape1}></div>
            <div className={styles.shape2}></div>

            <motion.div
                className={styles.card}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                <div className={styles.header}>
                    <div className={styles.brand}>
                        <Logo width={28} height={28} color="currentColor" />
                        <span className={styles.brandText}>MooW</span>
                    </div>
                    <h1 className={styles.title}>Reset Password</h1>
                    {/* Masih dummy, belum coba masuk ke email */}
                    <p className={styles.subtitle}>
                        {isSuccess
                            ? "Check your email for a reset link."
                            : "Enter your email space to receive a password reset link."}
                    </p>
                </div>

                {!isSuccess ? (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="email" className={styles.label}>Email Address</label>
                            <div className={styles.inputWrapper}>
                                <Mail className={styles.inputIcon} size={18} />
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    required
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className={styles.errorText}
                            >
                                <p>{errorMessage}</p>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Send Reset Link'}
                        </button>
                    </form>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={styles.form}
                    >
                        <button
                            type="button"
                            className={styles.submitButton}
                            onClick={() => setIsSuccess(false)}
                            style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                        >
                            Try another email
                        </button>
                    </motion.div>
                )}

                <div className={styles.divider}></div>

                <div className={styles.footerText}>
                    Remember your password? <Link href="/login" className={styles.link} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowLeft size={14} /> Back to Sign in
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
