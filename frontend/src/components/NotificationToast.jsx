import { useEffect } from "react";

function NotificationToast({ toast, onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = (type) => {
        switch (type) {
            case "Enrollment": return "🎓";
            case "Lesson": return "📚";
            case "QA": return "❓";
            case "Refund": return "💰";
            case "Announcement": return "📢";
            default: return "🔔";
        }
    };

    return (
        <div style={{
            background: "rgba(30, 41, 59, 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            padding: "16px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: "300px",
            maxWidth: "400px",
            animation: "slideIn 0.3s ease-out forwards",
            cursor: "pointer"
        }} onClick={onClose}>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
            <div style={{ fontSize: "1.5rem" }}>{getIcon(toast.notification_type)}</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "0.95rem", marginBottom: "4px" }}>
                    {toast.title}
                </div>
                <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                    {toast.message}
                </div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "1.1rem",
                    cursor: "pointer",
                    padding: "0"
                }}
            >
                ×
            </button>
        </div>
    );
}

export default NotificationToast;
