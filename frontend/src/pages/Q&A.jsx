import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/learningFlow.css";
import "../styles/learningFlowExtras.css";

function QA() {
    const { id: courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [hasEnrollmentAccess, setHasEnrollmentAccess] = useState(true);

    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingText, setEditingText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    
    // Status, presence, lock & analytics states
    const [connectionStatus, setConnectionStatus] = useState("reconnecting"); // "connected", "reconnecting", "offline"
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showPresenceList, setShowPresenceList] = useState(false);
    const [isRoomLocked, setIsRoomLocked] = useState(false);
    const [lockedBy, setLockedBy] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});
    const [errorMessage, setErrorMessage] = useState(null);

    // Modal analytics
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [statsData, setStatsData] = useState(null);
    
    const socketRef = useRef(null);
    const chatWindowRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Helpers
    const getRoleBadge = (role) => {
        if (role === "mentor") return { label: "Mentor", icon: "👨‍🏫", className: "role-mentor" };
        if (role === "admin" || role === "staff") return { label: "Admin", icon: "👨‍💼", className: "role-admin" };
        return { label: "Student", icon: "👨‍🎓", className: "role-student" };
    };

    const formatTime = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Load initial user & course details & chat history
    useEffect(() => {
        API.get(`courses/${courseId}/`)
            .then(res => setCourse(res.data))
            .catch(err => console.error("Error loading course:", err));

        API.get("accounts/profile/")
            .then(res => {
                setCurrentUser(res.data);
                if (res.data.role === "student") {
                    API.get("progress/")
                        .then(progRes => {
                            const isEnrolled = progRes.data.some(p => p.course === Number(courseId));
                            setHasEnrollmentAccess(isEnrolled);
                        })
                        .catch(() => setHasEnrollmentAccess(true));
                }
            })
            .catch(err => console.error("Error loading profile:", err));

        // Fetch chat history
        API.get(`chat/history/${courseId}/`)
            .then(res => {
                if (res.data && res.data.results) {
                    setMessages(res.data.results);
                } else if (Array.isArray(res.data)) {
                    setMessages(res.data);
                }
            })
            .catch(err => console.error("Error loading chat history:", err));
    }, [courseId]);

    // Setup WebSocket connection
    useEffect(() => {
        let isMounted = true;

        const connect = () => {
            if (!isMounted) return;
            setConnectionStatus("reconnecting");

            const envWsUrl = import.meta.env.VITE_WS_URL;
            let wsUrl = "";
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            if (envWsUrl) {
                const host = envWsUrl.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "").replace(/\/$/, "");
                wsUrl = `${protocol}//${host}/ws/chat/${courseId}/`;
            } else {
                wsUrl = `${protocol}//127.0.0.1:8000/ws/chat/${courseId}/`;
            }

            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                if (isMounted) {
                    setConnectionStatus("connected");
                    // Send mark read
                    socket.send(JSON.stringify({ type: "mark_read" }));
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "pong") return;

                    if (data.error) {
                        setErrorMessage(data.error);
                        setTimeout(() => setErrorMessage(null), 4000);
                        return;
                    }

                    if (data.type === "presence_update") {
                        setOnlineUsers(data.online_users || []);
                        return;
                    }

                    if (data.type === "read_receipt") {
                        setMessages(prev => prev.map(m => m.user_id !== data.read_by ? { ...m, is_read: true } : m));
                        return;
                    }

                    if (data.type === "room_locked") {
                        setIsRoomLocked(data.is_locked);
                        setLockedBy(data.locked_by);
                        return;
                    }

                    if (data.type === "typing") {
                        if (data.user_id !== currentUser?.id) {
                            setTypingUsers(prev => ({
                                ...prev,
                                [data.username]: data.is_typing
                            }));
                        }
                        return;
                    }

                    if (data.type === "message_deleted") {
                        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, is_deleted: true, message: data.message } : m));
                        return;
                    }

                    if (data.type === "message_edited") {
                        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, message: data.message, edited_at: data.edited_at } : m));
                        return;
                    }

                    if (data.type === "message_pinned") {
                        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, is_pinned: data.is_pinned } : m));
                        return;
                    }

                    // Standard message broadcast
                    if (data.id || data.type === "message") {
                        setMessages(prev => {
                            const index = prev.findIndex(m => (m.client_id && m.client_id === data.client_id) || m.id === data.id);
                            if (index !== -1) {
                                const updated = [...prev];
                                updated[index] = { ...data, sending: false };
                                return updated;
                            } else {
                                return [...prev, { ...data, sending: false }];
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error parsing WS message:", e);
                }
            };

            socket.onerror = () => {
                if (isMounted) setConnectionStatus("offline");
            };

            socket.onclose = () => {
                if (isMounted) setConnectionStatus("offline");
            };
        };

        connect();

        return () => {
            isMounted = false;
            if (socketRef.current) socketRef.current.close();
        };
    }, [courseId, currentUser?.id]);

    // Keep chat window scrolled to bottom
    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages, typingUsers, searchQuery]);

    // Typing handler with 2.5s auto-timeout
    const handleInputChange = (e) => {
        setInputMessage(e.target.value);
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: "typing", is_typing: true }));

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({ type: "typing", is_typing: false }));
                }
            }, 2500);
        }
    };

    // File Selection Handler
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert("File size exceeds 10 MB limit.");
            return;
        }
        setSelectedFile(file);
    };

    // Send Message / Attachment
    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if ((!inputMessage.trim() && !selectedFile) || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

        let attachmentUrl = "";
        let textToSend = inputMessage.trim();

        if (selectedFile) {
            setIsUploading(true);
            const formData = new FormData();
            formData.append("file", selectedFile);

            try {
                const uploadRes = await API.post(`chat/upload/${courseId}/`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                attachmentUrl = uploadRes.data.attachment_url;
                if (!textToSend) textToSend = uploadRes.data.filename;
            } catch (err) {
                setErrorMessage(err.response?.data?.error || "Error uploading file");
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
            setSelectedFile(null);
        }

        const client_id = "tmp-" + Date.now();
        const parent_id = replyingTo ? replyingTo.id : null;

        setInputMessage("");
        setReplyingTo(null);

        // Optimistic append
        const optimisticMsg = {
            id: client_id,
            client_id: client_id,
            sender_id: currentUser?.id,
            username: currentUser?.username,
            role: currentUser?.role,
            parent_id: parent_id,
            message: textToSend,
            attachment_url: attachmentUrl,
            created_at: new Date().toISOString(),
            is_read: false,
            sending: true
        };
        setMessages(prev => [...prev, optimisticMsg]);

        socketRef.current.send(JSON.stringify({
            message: textToSend,
            attachment_url: attachmentUrl,
            client_id: client_id,
            parent_id: parent_id
        }));
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Moderation & Statistics Actions
    const handleDeleteMessage = (msgId) => {
        if (!window.confirm("Delete this message?")) return;
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: "delete_message",
                message_id: msgId
            }));
        }
    };

    const handlePinMessage = (msgId) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: "pin_message",
                message_id: msgId
            }));
        }
    };

    const handleSaveEdit = (msgId) => {
        if (!editingText.trim()) return;
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: "edit_message",
                message_id: msgId,
                message: editingText.trim()
            }));
            setEditingMessageId(null);
            setEditingText("");
        }
    };

    const handleToggleLock = () => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: "toggle_lock"
            }));
        }
    };

    const handleMuteStudent = (userId, username) => {
        if (!window.confirm(`Mute ${username} for 15 minutes?`)) return;
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: "mute_user",
                user_id: userId,
                duration_minutes: 15
            }));
        }
    };

    const fetchStatistics = () => {
        API.get(`chat/statistics/${courseId}/`)
            .then(res => {
                setStatsData(res.data);
                setShowStatsModal(true);
            })
            .catch(err => alert("Error fetching statistics"));
    };

    const handleExportCSV = () => {
        window.open(`${API.defaults.baseURL}chat/export/${courseId}/`, "_blank");
    };

    const isMentorOrAdmin = currentUser?.role === "mentor" || currentUser?.role === "admin" || currentUser?.is_staff;

    // Filter messages by search term
    const filteredMessages = messages.filter(m => 
        !searchQuery.trim() || 
        m.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinnedMessage = messages.find(m => m.is_pinned && !m.is_deleted);
    const activeTypingList = Object.entries(typingUsers).filter(([_, isTyping]) => isTyping).map(([u]) => u);

    // Build 2-Level Reply Depth tree
    const topLevelMessages = filteredMessages.filter(m => !m.parent_id);
    const getRepliesFor = (parentId) => filteredMessages.filter(m => m.parent_id === parentId);

    const isImageFile = (url) => {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|png|webp)$/i);
    };

    return (
        <>
            <Navbar />
            <div className="learning-flow-container" style={{ padding: "20px 15px", maxWidth: "1100px", margin: "0 auto" }}>
                
                {/* Header bar */}
                <div className="qa-chat-header-bar">
                    <div>
                        <h2>💬 Course Q&A Chat: {course?.title || "Loading..."}</h2>
                        <span className="qa-chat-subtitle">Interactive discussion & real-time Q&A answers</span>
                    </div>

                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        {/* Search Bar */}
                        <div className="qa-search-box">
                            <input 
                                type="text"
                                placeholder="🔍 Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && <button onClick={() => setSearchQuery("")} className="qa-search-clear">✕</button>}
                        </div>

                        {/* Online Presence Pill */}
                        <div className="qa-presence-wrapper">
                            <button 
                                className="qa-presence-pill"
                                onClick={() => setShowPresenceList(!showPresenceList)}
                            >
                                🟢 {onlineUsers.length} Online {showPresenceList ? "▲" : "▼"}
                            </button>

                            {showPresenceList && (
                                <div className="qa-presence-dropdown">
                                    <h4>Online Participants ({onlineUsers.length})</h4>
                                    {onlineUsers.length === 0 ? (
                                        <div className="qa-presence-item">No other users online</div>
                                    ) : (
                                        onlineUsers.map(u => {
                                            const uBadge = getRoleBadge(u.role);
                                            return (
                                                <div key={u.user_id} className="qa-presence-item">
                                                    <span>{uBadge.icon} <strong>{u.username}</strong> ({uBadge.label})</span>
                                                    {isMentorOrAdmin && u.role === "student" && (
                                                        <button 
                                                            className="qa-mute-btn"
                                                            onClick={() => handleMuteStudent(u.user_id, u.username)}
                                                        >
                                                            Mute 15m
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Status badge */}
                        <div className="qa-chat-status-indicator">
                            {connectionStatus === "connected" && <span className="status-badge connected">Connected</span>}
                            {connectionStatus === "reconnecting" && <span className="status-badge reconnecting">Reconnecting...</span>}
                            {connectionStatus === "offline" && <span className="status-badge offline">Offline</span>}
                        </div>
                    </div>
                </div>

                {/* Mentor Action Bar (Stats & CSV Export) */}
                {isMentorOrAdmin && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button className="btn-secondary btn-sm" onClick={fetchStatistics}>📊 View Analytics</button>
                            <button className="btn-secondary btn-sm" onClick={handleExportCSV}>📥 Export CSV</button>
                        </div>
                        <button 
                            className={`qa-lock-toggle-btn ${isRoomLocked ? "locked" : ""}`}
                            onClick={handleToggleLock}
                        >
                            {isRoomLocked ? "🔓 Unlock Chat Room" : "🔒 Lock Chat Room for Students"}
                        </button>
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                    <div className="qa-error-banner">
                        ⚠️ {errorMessage}
                    </div>
                )}

                {/* Room Lock Indicator Banner */}
                {isRoomLocked && (
                    <div className="qa-locked-banner">
                        🔒 <strong>Room Locked:</strong> {lockedBy ? `Locked by mentor ${lockedBy}.` : "This room has been locked."} {currentUser?.role === "student" ? "Posting is restricted to mentors." : "Mentors can still post announcements."}
                    </div>
                )}

                {/* Read-Only Notice for Non-Enrolled Students */}
                {!hasEnrollmentAccess && (
                    <div className="qa-readonly-notice">
                        🔒 You must enroll in this course to participate in the live Q&A chat.
                    </div>
                )}

                {/* Pinned Announcement Bar */}
                {pinnedMessage && (
                    <div className="qa-pinned-bar">
                        <div className="qa-pinned-content">
                            <span>📌 <strong>Pinned Announcement ({pinnedMessage.username}):</strong> {pinnedMessage.message}</span>
                        </div>
                        {isMentorOrAdmin && (
                            <button className="qa-unpin-btn" onClick={() => handlePinMessage(pinnedMessage.id)}>Unpin</button>
                        )}
                    </div>
                )}

                {/* Main Chat Container */}
                <div className="qa-chat-container">
                    
                    {/* Chat Messages Window */}
                    <div className="qa-chat-window" ref={chatWindowRef}>
                        {topLevelMessages.length === 0 ? (
                            <div className="qa-empty-state">
                                💬 {searchQuery ? "No messages matching your search query." : "No questions asked yet. Be the first to start the conversation!"}
                            </div>
                        ) : (
                            topLevelMessages.map((msg) => {
                                const badge = getRoleBadge(msg.role);
                                const isSelf = msg.username === currentUser?.username;
                                const replies = getRepliesFor(msg.id);

                                return (
                                    <div key={msg.id} className="qa-thread-group">
                                        
                                        {/* Main Question Bubble */}
                                        <div className={`qa-message-row ${isSelf ? "self" : ""} ${badge.className}`}>
                                            <div className="qa-avatar">{badge.icon}</div>
                                            
                                            <div className="qa-msg-content-wrapper">
                                                <div className="qa-msg-header">
                                                    <span className="qa-username">{msg.username}</span>
                                                    <span className={`qa-role-tag ${badge.className}`}>{badge.label}</span>
                                                    <span className="qa-timestamp">{formatTime(msg.created_at || msg.timestamp)}</span>
                                                    {msg.edited_at && <span className="qa-edited-tag">(edited)</span>}
                                                    {isSelf && (
                                                        <span className="qa-read-status">
                                                            {msg.is_read ? "✓✓ Read" : "✓ Sent"}
                                                        </span>
                                                    )}
                                                </div>

                                                {editingMessageId === msg.id ? (
                                                    <div className="qa-edit-box">
                                                        <textarea 
                                                            value={editingText} 
                                                            onChange={(e) => setEditingText(e.target.value)}
                                                            rows={2} 
                                                        />
                                                        <div className="qa-edit-actions">
                                                            <button onClick={() => handleSaveEdit(msg.id)} className="primary-btn btn-sm">Save</button>
                                                            <button onClick={() => setEditingMessageId(null)} className="btn-secondary btn-sm">Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="qa-bubble">
                                                        {msg.message}
                                                        {msg.attachment_url && (
                                                            <div className="qa-attachment-box">
                                                                {isImageFile(msg.attachment_url) ? (
                                                                    <img src={msg.attachment_url} alt="attachment" className="qa-attachment-img" />
                                                                ) : (
                                                                    <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="qa-attachment-link">
                                                                        📄 Download File Attachment
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action Bar */}
                                                {!msg.is_deleted && (
                                                    <div className="qa-msg-actions">
                                                        {hasEnrollmentAccess && (!isRoomLocked || isMentorOrAdmin) && (!replyingTo || replyingTo.id === msg.id) && (
                                                            <button onClick={() => setReplyingTo(msg)} className="qa-action-link">
                                                                ↳ Reply
                                                            </button>
                                                        )}

                                                        {(isSelf || isMentorOrAdmin) && (
                                                            <button onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.message); }} className="qa-action-link">
                                                                ✏️ Edit
                                                            </button>
                                                        )}

                                                        {(isSelf || isMentorOrAdmin) && (
                                                            <button onClick={() => handleDeleteMessage(msg.id)} className="qa-action-link delete">
                                                                🗑️ Delete
                                                            </button>
                                                        )}

                                                        {isMentorOrAdmin && (
                                                            <button onClick={() => handlePinMessage(msg.id)} className="qa-action-link pin">
                                                                {msg.is_pinned ? "📌 Unpin" : "📌 Pin"}
                                                            </button>
                                                        )}
                                                        {msg.sending && <span className="qa-sending-tag">Sending...</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Threaded Replies (Single-Level Nesting) */}
                                        {replies.length > 0 && (
                                            <div className="qa-replies-container">
                                                {replies.map(reply => {
                                                    const rBadge = getRoleBadge(reply.role);
                                                    const rIsSelf = reply.username === currentUser?.username;

                                                    return (
                                                        <div key={reply.id} className={`qa-message-row reply-row reply-message ${rIsSelf ? "self" : ""} ${rBadge.className}`}>
                                                            <div className="qa-avatar sm">{rBadge.icon}</div>
                                                            
                                                            <div className="qa-msg-content-wrapper">
                                                                <div className="qa-msg-header">
                                                                    <span className="qa-username">{reply.username}</span>
                                                                    <span className={`qa-role-tag ${rBadge.className}`}>{rBadge.label}</span>
                                                                    <span className="qa-timestamp">{formatTime(reply.created_at || reply.timestamp)}</span>
                                                                    {reply.edited_at && <span className="qa-edited-tag">(edited)</span>}
                                                                    {rIsSelf && (
                                                                        <span className="qa-read-status">
                                                                            {reply.is_read ? "✓✓ Read" : "✓ Sent"}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {editingMessageId === reply.id ? (
                                                                    <div className="qa-edit-box">
                                                                        <textarea 
                                                                            value={editingText} 
                                                                            onChange={(e) => setEditingText(e.target.value)}
                                                                            rows={2} 
                                                                        />
                                                                        <div className="qa-edit-actions">
                                                                            <button onClick={() => handleSaveEdit(reply.id)} className="primary-btn btn-sm">Save</button>
                                                                            <button onClick={() => setEditingMessageId(null)} className="btn-secondary btn-sm">Cancel</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="qa-bubble reply-bubble">
                                                                        {reply.message}
                                                                        {reply.attachment_url && (
                                                                            <div className="qa-attachment-box">
                                                                                {isImageFile(reply.attachment_url) ? (
                                                                                    <img src={reply.attachment_url} alt="attachment" className="qa-attachment-img" />
                                                                                ) : (
                                                                                    <a href={reply.attachment_url} target="_blank" rel="noreferrer" className="qa-attachment-link">
                                                                                        📄 Download Attachment
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {!reply.is_deleted && (
                                                                    <div className="qa-msg-actions">
                                                                        {(rIsSelf || isMentorOrAdmin) && (
                                                                            <button onClick={() => { setEditingMessageId(reply.id); setEditingText(reply.message); }} className="qa-action-link">
                                                                                ✏️ Edit
                                                                            </button>
                                                                        )}
                                                                        {(rIsSelf || isMentorOrAdmin) && (
                                                                            <button onClick={() => handleDeleteMessage(reply.id)} className="qa-action-link delete">
                                                                                🗑️ Delete
                                                                            </button>
                                                                        )}
                                                                        {reply.sending && <span className="qa-sending-tag">Sending...</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Active Typing Indicator */}
                    {activeTypingList.length > 0 && (
                        <div className="qa-typing-bar">
                            ✍️ {activeTypingList.join(", ")} {activeTypingList.length === 1 ? "is" : "are"} typing...
                        </div>
                    )}

                    {/* Selected File Banner */}
                    {selectedFile && (
                        <div className="qa-file-banner">
                            <span>📎 Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                            <button onClick={() => setSelectedFile(null)} className="qa-cancel-reply">✕</button>
                        </div>
                    )}

                    {/* Replying Banner */}
                    {replyingTo && (
                        <div className="qa-reply-banner">
                            <span>↳ Replying to <strong>@{replyingTo.username}</strong>: "{replyingTo.message.substring(0, 40)}..."</span>
                            <button onClick={() => setReplyingTo(null)} className="qa-cancel-reply">✕</button>
                        </div>
                    )}

                    {/* Input Controls */}
                    {hasEnrollmentAccess ? (
                        (isRoomLocked && currentUser?.role === "student") ? (
                            <div className="qa-input-disabled-bar">
                                🔒 This chat room is locked. Posting is currently restricted to mentors.
                            </div>
                        ) : (
                            <div className="qa-input-bar">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    style={{ display: "none" }} 
                                    onChange={handleFileSelect} 
                                    accept="image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                />
                                <button 
                                    type="button" 
                                    className="qa-file-btn" 
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Attach File (Max 10MB)"
                                >
                                    📎
                                </button>
                                <textarea
                                    placeholder={replyingTo ? `Type reply to @${replyingTo.username}...` : "Ask a question or share a thought (Enter to send, Shift+Enter for new line)..."}
                                    value={inputMessage}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    rows={2}
                                />
                                <button 
                                    onClick={handleSendMessage} 
                                    disabled={(!inputMessage.trim() && !selectedFile) || connectionStatus !== "connected" || isUploading}
                                    className="primary-btn qa-send-btn"
                                >
                                    {isUploading ? "Uploading..." : "Send 🚀"}
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="qa-input-disabled-bar">
                            Enroll in this course to join the live Q&A conversation.
                        </div>
                    )}
                </div>
            </div>

            {/* Statistics Modal for Mentors */}
            {showStatsModal && statsData && (
                <div className="qa-modal-overlay">
                    <div className="qa-modal-card">
                        <h3>📊 Chat Statistics & Analytics</h3>
                        <div className="qa-stats-grid">
                            <div className="qa-stat-item">
                                <span className="stat-value">{statsData.total_messages}</span>
                                <span className="stat-label">Total Messages</span>
                            </div>
                            <div className="qa-stat-item">
                                <span className="stat-value">{statsData.participants}</span>
                                <span className="stat-label">Active Participants</span>
                            </div>
                            <div className="qa-stat-item">
                                <span className="stat-value">{statsData.attachments}</span>
                                <span className="stat-label">File Attachments</span>
                            </div>
                            <div className="qa-stat-item">
                                <span className="stat-value">{statsData.pinned_messages}</span>
                                <span className="stat-label">Pinned Announcements</span>
                            </div>
                            <div className="qa-stat-item">
                                <span className="stat-value">{statsData.deleted_messages}</span>
                                <span className="stat-label">Deleted Messages</span>
                            </div>
                            <div className="qa-stat-item">
                                <span className="stat-value">{statsData.today_messages}</span>
                                <span className="stat-label">Messages Today</span>
                            </div>
                        </div>
                        <button onClick={() => setShowStatsModal(false)} className="primary-btn" style={{ marginTop: "20px" }}>
                            Close Analytics
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default QA;
