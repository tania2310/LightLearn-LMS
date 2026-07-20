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
                                <div className="notification-card-body">
                                    <div className="notification-card-icon">{getIcon(n.notification_type)}</div>
                                    <div className="notification-card-details">
                                        <div className="notification-card-header">
                                            <span className="notification-card-title" style={{ fontWeight: n.is_read ? "600" : "700" }}>
                                                {n.title}
                                            </span>
                                            <span className="notification-card-time">
                                                {new Date(n.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="notification-card-message">
                                            {n.message}
                                        </p>
                                        <span className="notification-card-type">
                                            {n.notification_type}
                                        </span>
                                    </div>
                                </div>
                                {!n.is_read && (
                                    <div className="notification-card-unread" />
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
