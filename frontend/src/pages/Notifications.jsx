import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useNotifications } from "../components/NotificationProvider";
import "../styles/learningFlow.css";
import "../styles/learningFlowExtras.css";

function Notifications() {
    const navigate = useNavigate();
    const { notifications, unreadCount, fetchAll, markRead, markAllRead } = useNotifications();

    useEffect(() => {
        fetchAll();
    }, []);

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

    const handleNotificationClick = (n) => {
        markRead(n.id);
        if (n.target_url) {
            navigate(n.target_url);
        }
    };

    return (
        <>
            <Navbar />
            <div className="notifications-page-container">
                <div className="notifications-header">
                    <div className="notifications-header-left">
                        <h1 className="notifications-title">Notification Center</h1>
                        <p className="notifications-unread-subtitle">
                            You have <strong>{unreadCount}</strong> unread notifications
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button 
                            className="btn-secondary" 
                            onClick={markAllRead}
                            style={{ cursor: "pointer", padding: "8px 16px" }}
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                <div className="notifications-list">
                    {notifications.length === 0 ? (
                        <div className="notification-empty-card">
                            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🔔</div>
                            <h3 style={{ color: "var(--text-h)", margin: "0 0 10px 0", fontSize: "1.3rem" }}>No notifications yet</h3>
                            <p style={{ color: "var(--text)", margin: 0, fontSize: "0.95rem" }}>
                                You're all caught up! We will notify you when something new arrives.
                            </p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div 
                                key={n.id} 
                                className="notification-item-card"
                                onClick={() => handleNotificationClick(n)}
                                style={{
                                    borderLeft: n.is_read ? "3px solid transparent" : "3px solid #7c3aed",
                                    background: n.is_read ? "var(--card-bg)" : "var(--hover-bg, rgba(124, 58, 237, 0.03))"
                                }}
                            >
                                <div style={{ display: "flex", gap: "15px", alignItems: "flex-start" }}>
                                    <div style={{ fontSize: "1.8rem" }}>{getIcon(n.notification_type)}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                                            <span style={{ fontWeight: n.is_read ? "600" : "700", color: "var(--text-h)", fontSize: "1rem" }}>
                                                {n.title}
                                            </span>
                                            <span style={{ fontSize: "0.75rem", color: "var(--text)" }}>
                                                {new Date(n.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p style={{ color: "var(--text)", fontSize: "0.9rem", margin: "0 0 5px 0" }}>
                                            {n.message}
                                        </p>
                                        <span style={{
                                            fontSize: "0.75rem",
                                            background: "var(--bg)",
                                            padding: "2px 8px",
                                            borderRadius: "12px",
                                            color: "var(--text-h)",
                                            fontWeight: "500"
                                        }}>
                                            {n.notification_type}
                                        </span>
                                    </div>
                                </div>
                                {!n.is_read && (
                                    <div style={{
                                        position: "absolute",
                                        top: "15px",
                                        right: "15px",
                                        width: "8px",
                                        height: "8px",
                                        borderRadius: "50%",
                                        background: "#7c3aed"
                                    }} />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

export default Notifications;
