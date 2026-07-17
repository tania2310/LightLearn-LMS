import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/learningFlow.css";
import "../styles/learningFlowExtras.css";

function Discussion() {
    const { id: courseId } = useParams();
    const navigate = useNavigate();
    const messageEndRef = useRef(null);

    const [course, setCourse] = useState(null);
    const [chatroom, setChatroom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [inputText, setInputText] = useState("");
    const [wsConnected, setWsConnected] = useState(false);

    const socketRef = useRef(null);

    const isMentor = currentUser && course && currentUser.username === course.mentor;
    const isAdmin = currentUser && currentUser.role === "admin";
    const canModerate = isMentor || isAdmin;

    useEffect(() => {
        // Fetch course details
        API.get(`courses/${courseId}/`)
            .then(res => setCourse(res.data))
            .catch(console.log);

        // Fetch current user details
        API.get("accounts/profile/")
            .then(res => setCurrentUser(res.data))
            .catch(console.log);

        // Fetch or create chatroom for this course
        API.get("discussion/chatrooms/")
            .then(res => {
                const room = res.data.find(r => r.course === Number(courseId));
                if (room) {
                    setChatroom(room);
                    fetchHistory(room.id);
                    connectWebSocket(room.id);
                } else {
                    // Create new chatroom if not found
                    API.post("discussion/chatrooms/", { course: Number(courseId) })
                        .then(createRes => {
                            setChatroom(createRes.data);
                            fetchHistory(createRes.data.id);
                            connectWebSocket(createRes.data.id);
                        })
                        .catch(console.log);
                }
            })
            .catch(console.log);

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [courseId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchHistory = (roomId) => {
        API.get(`discussion/chatrooms/${roomId}/history/`)
            .then(res => {
                setMessages(res.data);
            })
            .catch(console.log);
    };

    const connectWebSocket = () => {
        // Setup WebSocket connection using courseId (since consumer parses course_id in ws/chat/<course_id>/)
        const getWsUrl = () => {
            const envWsUrl = import.meta.env.VITE_WS_URL;
            if (envWsUrl) {
                if (envWsUrl.startsWith("ws://") || envWsUrl.startsWith("wss://")) {
                    return `${envWsUrl}ws/chat/${courseId}/`;
                }
                const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                return `${wsProtocol}//${envWsUrl}/ws/chat/${courseId}/`;
            }
            const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            return `${wsProtocol}//127.0.0.1:8000/ws/chat/${courseId}/`;
        };
        const wsUrl = getWsUrl();
        
        console.log("Connecting to WebSocket:", wsUrl);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log("WebSocket connected.");
            setWsConnected(true);
        };

        socket.onmessage = (e) => {
            const data = jsonParseSafe(e.data);
            if (data) {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                if (data.message) {
                    // Append new message from WebSocket
                    setMessages(prev => [
                        ...prev,
                        {
                            id: Date.now(), // fallback temporary id
                            sender_name: data.username || "User",
                            message: data.message,
                            created_at: new Date().toISOString()
                        }
                    ]);
                }
            }
        };

        socket.onclose = (event) => {
            console.log("WebSocket closed. Code:", event.code);
            setWsConnected(false);
            // Re-fetch history occasionally as fallback
        };

        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
            setWsConnected(false);
        };
    };

    const jsonParseSafe = (str) => {
        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    };

    const handleDeleteMessage = (messageId) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;

        API.delete(`discussion/messages/${messageId}/delete/`)
            .then(() => {
                alert("Message deleted successfully.");
                if (chatroom) fetchHistory(chatroom.id);
            })
            .catch((err) => {
                console.error("Delete error:", err);
                alert("Failed to delete message.");
            });
    };

    const handleToggleLock = () => {
        if (!chatroom) return;
        const actionStr = chatroom.is_locked ? "unlock" : "lock";
        API.post(`discussion/chatrooms/${chatroom.id}/${actionStr}/`)
            .then(() => {
                alert(`Chat room ${actionStr}ed successfully.`);
                setChatroom(prev => ({ ...prev, is_locked: actionStr === "lock" }));
            })
            .catch((err) => {
                console.error("Lock toggle error:", err);
                alert("Failed to update lock status.");
            });
    };

    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        if (wsConnected && socketRef.current) {
            // Send via WebSocket
            socketRef.current.send(JSON.stringify({
                message: inputText
            }));
            setInputText("");
        } else {
            // Fallback HTTP POST message
            if (!chatroom) return;
            API.post("discussion/messages/", {
                room: chatroom.id,
                message: inputText
            })
                .then(() => {
                    setInputText("");
                    fetchHistory(chatroom.id);
                })
                .catch(console.log);
        }
    };

    return (
        <>
            <Navbar />
            <div className="chat-container">
                <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button className="btn-secondary" onClick={() => navigate(`/courses/${courseId}/modules`)}>
                        ← Back to Learning
                    </button>
                    <span style={{ fontSize: "0.85rem", color: wsConnected ? "#10b981" : "#ef4444", fontWeight: "600" }}>
                        {wsConnected ? "● Live Connected" : "● Offline (Sync Mode)"}
                    </span>
                </div>

                <div className="chat-room">
                    <div className="chat-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                        <h2>{course ? `${course.title} Discussion` : "Classroom Chat"}</h2>
                        {canModerate && chatroom && (
                            <button 
                                className="btn-secondary" 
                                style={{ background: chatroom.is_locked ? "#10b981" : "#ef4444", color: "white", padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer", transition: "var(--transition)" }}
                                onClick={handleToggleLock}
                            >
                                {chatroom.is_locked ? "🔓 Unlock Chat" : "🔒 Lock Chat"}
                            </button>
                        )}
                    </div>

                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <p style={{ color: "var(--text)", textAlign: "center", margin: "auto" }}>
                                Start the discussion by posting a message!
                            </p>
                        ) : (
                            messages.map((msg, index) => {
                                const isOwn = currentUser && msg.sender === currentUser.id;
                                const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

                                return (
                                    <div key={msg.id || index} className={`chat-msg-row ${isOwn ? 'own' : ''}`}>
                                        <div className="chat-avatar">
                                            {msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : "U"}
                                        </div>
                                        <div className="chat-msg-bubble">
                                            <div className="chat-msg-meta">
                                                <span>{msg.sender_name || "User"}</span>
                                                <span>{timeStr}</span>
                                            </div>
                                            <div className="chat-msg-text">{msg.message}</div>
                                            {canModerate && (
                                                <button 
                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.85rem", padding: "5px 0 0", display: "block", width: "fit-content" }}
                                                >
                                                    🗑️ Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messageEndRef} />
                    </div>

                    {chatroom && chatroom.is_locked && !canModerate ? (
                        <div style={{ padding: "15px", background: "#fef2f2", borderTop: "1px solid var(--border)", color: "#991b1b", textAlign: "center", fontWeight: "600" }}>
                            🔒 This chat room has been locked by a mentor.
                        </div>
                    ) : (
                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                placeholder={chatroom && chatroom.is_locked ? "Room is locked (You have moderator posting access)..." : "Type a message..."}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            />
                            <button type="submit" className="btn-send">
                                Send
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
}

export default Discussion;
