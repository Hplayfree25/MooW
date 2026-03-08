import { Info } from "lucide-react";
import styles from "./ErrorModal.module.css";

interface ErrorModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onClose: () => void;
}

export function ErrorModal({ isOpen, title = "Database Error", message, onClose }: ErrorModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.iconContainer}>
                    <Info size={48} />
                </div>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <button onClick={onClose} className={styles.btnPrimary}>
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
