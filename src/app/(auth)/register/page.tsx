"use client";

import { useActionState, useState } from "react";
import { register } from "../actions";
import { motion } from "framer-motion";
import styles from "../auth.module.css";
import { Github, Loader2, Lock, User, Check } from "lucide-react"; // yg penting github ny bisa
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";

export default function RegisterPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        register,
        undefined,
    );

    const [passwordError, setPasswordError] = useState("");

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        if (e.target.value !== passwordInput?.value) {
            e.target.setCustomValidity("Passwords do not match");
            setPasswordError("Passwords do not match");
        } else {
            e.target.setCustomValidity("");
            setPasswordError("");
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const confirmInput = document.getElementById('confirmPassword') as HTMLInputElement;
        if (confirmInput?.value) {
            if (e.target.value !== confirmInput.value) {
                confirmInput.setCustomValidity("Passwords do not match");
            } else {
                confirmInput.setCustomValidity("");
            }
        }
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
                    <h1 className={styles.title}>Join MooW Today!</h1>
                    <p className={styles.subtitle}>Create your free account to get started.</p>
                </div>

                <form action={formAction} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="username" className={styles.label}>Username</label>
                        <div className={styles.inputWrapper}>
                            <User className={styles.inputIcon} size={18} />
                            <input
                                id="username"
                                type="text"
                                name="username"
                                placeholder="Choose a username"
                                required
                                autoComplete="username"
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="password" className={styles.label}>Choose Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    onChange={handlePasswordChange}
                                    autoComplete="new-password"
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="••••••••"
                                    required
                                    onChange={handleConfirmPasswordChange}
                                    autoComplete="new-password"
                                    className={styles.input}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.inputGroup} style={{ gap: '0.75rem', marginTop: '0.25rem' }}>
                        <label className={styles.checkboxGroup}>
                            <input
                                type="checkbox"
                                name="terms"
                                required
                                className={styles.checkboxInput}
                            />
                            <div className={styles.checkboxCustom}>
                                <Check className={styles.checkboxIcon} strokeWidth={3} size={12} />
                            </div>
                            <span className={styles.checkboxLabel}>
                                I have read and agree to the <Link href="#" className={styles.link} style={{ fontSize: 'inherit' }}>Terms of Service</Link> and <Link href="#" className={styles.link} style={{ fontSize: 'inherit' }}>Privacy Policy</Link>.
                            </span>
                        </label>

                        <label className={styles.checkboxGroup}>
                            <input
                                type="checkbox"
                                name="newsletter"
                                className={styles.checkboxInput}
                            />
                            <div className={styles.checkboxCustom}>
                                <Check className={styles.checkboxIcon} strokeWidth={3} size={12} />
                            </div>
                            <span className={styles.checkboxLabel}>
                                I would like to receive product updates and newsletters (optional).
                            </span>
                        </label>
                    </div>

                    {(errorMessage) && (
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
                        {isPending ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Create Account'}
                    </button>
                </form>

                <div className={styles.divider}>Or sign up with</div>

                <div className={styles.socialContainer}>
                    <button
                        type="button"
                        onClick={() => signIn("google", { callbackUrl: "/" })}
                        className={`${styles.socialButton} ${styles.googleBtn}`}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>
                    <button
                        type="button"
                        onClick={() => signIn("github", { callbackUrl: "/" })}
                        className={`${styles.socialButton} ${styles.githubBtn}`}
                    >
                        <Github size={18} />
                        Continue with GitHub
                    </button>
                </div>

                <div className={styles.footerText}>
                    Already have an account? <Link href="/login" className={styles.link}>Sign in here.</Link>
                </div>
            </motion.div>
        </div>
    );
}
