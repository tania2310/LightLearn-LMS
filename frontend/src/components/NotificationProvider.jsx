import { createContext, useContext, useEffect, useState, useRef } from "react";
import { getNotifications, getUnreadNotifications, markRead, markAllRead } from "../api/api";
import NotificationToast from "./NotificationToast";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);
    const socketRef = useRef(null);

    const fetchUnread = () => {
        getUnreadNotifications()
            .then(res => {
                setUnreadCount(res.data.length);
            })
            .catch(console.error);
    };

    const fetchAll = () => {
        getNotifications()
            .then(res => {
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.is_read).length);
            })
            .catch(console.error);
    };

    // Close socket on component unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    // Effect to handle socket connections based on log-in state
    useEffect(() => {
        const token = localStorage.getItem("access");
        if (!token) {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
            return;
        }

        // Fetch initial unread counts
        fetchUnread();

        // Connect WebSocket
        const getWsUrl = () => {
            const envWsUrl = import.meta.env.VITE_WS_URL;
            let baseUrl = "127.0.0.1:8000";
            if (envWsUrl) {
                baseUrl = envWsUrl.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "");
            }
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            return `${protocol}//${baseUrl}/ws/notifications/?token=${token}`;
        };

        const wsUrl = getWsUrl();
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Prepend new notification
                setNotifications(prev => [data, ...prev]);
                setUnreadCount(prev => prev + 1);

                // Add to toast queue
                const toastId = Date.now();
                setToasts(prev => [...prev, { id: toastId, ...data }]);
            } catch (err) {
                console.error("Error parsing socket message:", err);
            }
        };

        socket.onclose = () => {
            console.log("Notification socket closed.");
        };

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [localStorage.getItem("access")]);

    const handleMarkRead = (id) => {
        return markRead(id).then(() => {
            setNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        });
    };

    const handleMarkAllRead = () => {
        return markAllRead().then(() => {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        });
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            fetchAll,
            fetchUnread,
            markRead: handleMarkRead,
            markAllRead: handleMarkAllRead
        }}>
            {children}
            <div style={{
                position: "fixed",
                bottom: "20px",
                right: "20px",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                gap: "10px"
            }}>
                {toasts.map(toast => (
                    <NotificationToast 
                        key={toast.id}
                        toast={toast}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
