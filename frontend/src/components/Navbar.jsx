import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useNotifications } from "./NotificationProvider";
import { autocomplete } from "../api/api";
import "../styles/navbar.css";

function Navbar() {
    const navigate = useNavigate();
    const { notifications, unreadCount, fetchUnread, fetchAll, markRead, markAllRead } = useNotifications();
    const [showDropdown, setShowDropdown] = useState(false);

    // Navbar search & autocomplete states
    const [navSearch, setNavSearch] = useState("");
    const [navSuggestions, setNavSuggestions] = useState(null);
    const [showNavSuggestions, setShowNavSuggestions] = useState(false);
    const navSuggestionRef = useRef(null);

    const role = localStorage.getItem("role");

    const username = localStorage.getItem("username") || "User";

    useEffect(() => {
        if (localStorage.getItem("access")) {
            fetchUnread();
        }
    }, []);

    const logout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("role");
        localStorage.removeItem("username");

        navigate("/");
    };

    const toggleDropdown = () => {
        if (!showDropdown) {
            fetchAll();
        }
        setShowDropdown(!showDropdown);
    };

    const handleNotificationClick = (n) => {
        markRead(n.id);
        setShowDropdown(false);
        if (n.target_url) {
            navigate(n.target_url);
        }
    };

    useEffect(() => {
        if (!navSearch) {
            setNavSuggestions(null);
            return;
        }
        const delayDebounce = setTimeout(() => {
            autocomplete(navSearch)
                .then(res => setNavSuggestions(res.data))
                .catch(console.error);
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [navSearch]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (navSuggestionRef.current && !navSuggestionRef.current.contains(e.target)) {
                setShowNavSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNavSearchSubmit = (e) => {
        e.preventDefault();
        if (navSearch.trim()) {
            navigate(`/search?q=${encodeURIComponent(navSearch.trim())}`);
            setShowNavSuggestions(false);
        }
    };

    return (
        <nav className="navbar">

            <div className="logo">
                🎓 LearnHub
            </div>
            <div className="nav-links">

                {role === "student" && (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/courses">Courses</Link>
                        <Link to="/progress">My Progress</Link>
                    </>
                )}

                {role === "mentor" && (
                    <>
                        <Link to="/mentor">Dashboard</Link>
                        <Link to="/mentor/create-course">
                            Create Course
                        </Link>
                    </>
                )}

                {role === "admin" && (
                    <>
                        <Link to="/admin">Dashboard</Link>

                        <Link to="/admin/pending-mentors">
                            Mentor Approvals
                        </Link>
                        <Link to="/admin/enrollments">
                            <button>Pending Enrollments</button>
                        </Link>
                    </>
                )}

                {role && (
                    <>
                        <div style={{ position: "relative", display: "inline-block", marginRight: "10px" }} ref={navSuggestionRef}>
                            <form onSubmit={handleNavSearchSubmit} style={{ display: "flex", margin: 0 }}>
                                <input 
                                    type="text"
                                    placeholder="Search LearnHub..."
                                    value={navSearch}
                                    onChange={(e) => {
                                        setNavSearch(e.target.value);
                                        setShowNavSuggestions(true);
                                    }}
                                    onFocus={() => setShowNavSuggestions(true)}
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: "20px",
                                        border: "1px solid var(--border)",
                                        fontSize: "0.85rem",
                                        width: "180px",
                                        background: "var(--bg)",
                                        color: "var(--text-h)"
                                    }}
                                />
                            </form>
                            {showNavSuggestions && navSuggestions && (
                                <div style={{
                                    position: "absolute",
                                    top: "35px",
                                    left: "0",
                                    width: "280px",
                                    background: "var(--card-bg, #ffffff)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "8px",
                                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                    zIndex: 1100,
                                    maxHeight: "300px",
                                    overflowY: "auto",
                                    textAlign: "left"
                                }}>
                                    {navSuggestions.courses.length > 0 && (
                                        <div style={{ padding: "8px 12px" }}>
                                            <div style={{ fontSize: "0.75rem", color: "#7c3aed", fontWeight: "600", textTransform: "uppercase", marginBottom: "3px" }}>Courses</div>
                                            {navSuggestions.courses.map(c => (
                                                <Link 
                                                    key={c.id} 
                                                    to={`/courses/${c.id}`}
                                                    style={{ display: "block", padding: "4px 0", color: "var(--text-h)", textDecoration: "none", fontSize: "0.8rem" }}
                                                    onClick={() => setShowNavSuggestions(false)}
                                                >
                                                    📖 {c.title}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                    {navSuggestions.mentors.length > 0 && (
                                        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)" }}>
                                            <div style={{ fontSize: "0.75rem", color: "#7c3aed", fontWeight: "600", textTransform: "uppercase", marginBottom: "3px" }}>Mentors</div>
                                            {navSuggestions.mentors.map(m => (
                                                <div 
                                                    key={m.id} 
                                                    onClick={() => {
                                                        navigate(`/search?q=${encodeURIComponent(m.username)}`);
                                                        setShowNavSuggestions(false);
                                                    }}
                                                    style={{ cursor: "pointer", padding: "4px 0", color: "var(--text-h)", fontSize: "0.8rem" }}
                                                >
                                                    👨‍🏫 {m.username}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {navSuggestions.courses.length === 0 && navSuggestions.mentors.length === 0 && (
                                        <div style={{ padding: "10px", textAlign: "center", color: "var(--text)", fontSize: "0.8rem" }}>Press Enter to search</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <Link to="/notifications">Notifications</Link>
                    </>
                )}
            </div>

            <div className="user-section" style={{ position: "relative" }}>
                
                {role && (
                    <div style={{ position: "relative", marginRight: "15px", display: "flex", alignItems: "center" }}>
                        <button 
                            onClick={toggleDropdown}
                            style={{
                                background: "none",
                                border: "none",
                                fontSize: "1.4rem",
                                cursor: "pointer",
                                padding: "5px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--text-h)"
                            }}
                        >
                            🔔
                            {unreadCount > 0 && (
                                <span style={{
                                    position: "absolute",
                                    top: "-2px",
                                    right: "-2px",
                                    background: "#ef4444",
                                    color: "white",
                                    borderRadius: "50%",
                                    padding: "2px 6px",
                                    fontSize: "0.7rem",
                                    fontWeight: "bold",
                                    lineHeight: "1"
                                }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {showDropdown && (
                            <div style={{
                                position: "absolute",
                                top: "45px",
                                right: "0",
                                width: "320px",
                                background: "var(--card-bg, #ffffff)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                zIndex: 1000,
                                overflow: "hidden"
                            }}>
                                <div style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid var(--border)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    background: "var(--bg)"
                                }}>
                                    <span style={{ fontWeight: "600", color: "var(--text-h)" }}>Notifications</span>
                                    {unreadCount > 0 && (
                                        <button 
                                            onClick={markAllRead}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#7c3aed",
                                                fontSize: "0.8rem",
                                                cursor: "pointer",
                                                fontWeight: "500"
                                            }}
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: "20px", textAlign: "center", color: "var(--text)", fontSize: "0.9rem" }}>
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.slice(0, 5).map(n => (
                                            <div 
                                                key={n.id} 
                                                onClick={() => handleNotificationClick(n)}
                                                style={{
                                                    padding: "12px 16px",
                                                    borderBottom: "1px solid var(--border)",
                                                    cursor: "pointer",
                                                    background: n.is_read ? "transparent" : "var(--hover-bg, rgba(124, 58, 237, 0.04))",
                                                    transition: "background 0.2s"
                                                }}
                                            >
                                                <div style={{ fontWeight: n.is_read ? "500" : "600", fontSize: "0.85rem", color: "var(--text-h)", marginBottom: "4px" }}>
                                                    {n.title}
                                                </div>
                                                <div style={{ fontSize: "0.8rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {n.message}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div style={{
                                    borderTop: "1px solid var(--border)",
                                    textAlign: "center",
                                    background: "var(--bg)"
                                }}>
                                    <Link 
                                        to="/notifications" 
                                        onClick={() => setShowDropdown(false)}
                                        style={{
                                            display: "block",
                                            padding: "10px",
                                            fontSize: "0.85rem",
                                            color: "#7c3aed",
                                            fontWeight: "500",
                                            textDecoration: "none"
                                        }}
                                    >
                                        View all notifications
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="avatar">
                    {username.charAt(0).toUpperCase()}
                </div>

                <span className={`badge ${role}`}>
                    {role}
                </span>

                <button
                    className="logout-btn"
                    onClick={logout}
                >
                    Logout
                </button>

            </div>

        </nav>
    );
}

export default Navbar;