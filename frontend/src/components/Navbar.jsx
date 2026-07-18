import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useNotifications } from "./NotificationProvider";
import { autocomplete } from "../api/api";
import { useTheme } from "../context/ThemeContext";
import "../styles/navbar.css";

function Navbar() {
    const navigate = useNavigate();
    const { notifications, unreadCount, fetchUnread, fetchAll, markRead, markAllRead } = useNotifications();
    const [showDropdown, setShowDropdown] = useState(false);
    const { theme, setTheme } = useTheme();

    // Navbar search & autocomplete states
    const [navSearch, setNavSearch] = useState("");
    const [navSuggestions, setNavSuggestions] = useState(null);
    const [showNavSuggestions, setShowNavSuggestions] = useState(false);
    const navSuggestionRef = useRef(null);

    // Mobile hamburger menu toggle
    const [menuOpen, setMenuOpen] = useState(false);

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

    const handleLogoClick = () => {
        if (!role) {
            navigate("/");
        } else if (role === "student") {
            navigate("/dashboard");
        } else if (role === "mentor") {
            navigate("/mentor");
        } else if (role === "admin") {
            navigate("/admin");
        }
    };

    return (
        <nav className="navbar">
            {/* Top row (Row 1) */}
            <div className="navbar-top">
                <div className="navbar-logo" onClick={handleLogoClick} style={{ cursor: "pointer" }}>
                    🎓 LearnHub
                </div>

                <div className="navbar-profile-section">
                    {role && (
                        <div style={{ position: "relative", marginRight: "10px", display: "flex", alignItems: "center" }}>
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
                                    color: "var(--text-h)",
                                    position: "relative"
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

                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="theme-selector"
                        style={{
                            padding: "6px 10px",
                            marginRight: "15px",
                            borderRadius: "20px",
                            border: "1px solid var(--border)",
                            background: "var(--bg)",
                            color: "var(--text-h)",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            outline: "none"
                        }}
                    >
                        <option value="light">☀️ Light</option>
                        <option value="dark">🌙 Dark</option>
                        <option value="system">💻 System</option>
                    </select>

                    {role ? (
                        <>
                            <div className="avatar">
                                {username.charAt(0).toUpperCase()}
                            </div>
                            <span className={`badge ${role}`}>
                                {role}
                            </span>
                            <button
                                className="navbar-logout"
                                onClick={logout}
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <Link to="/" className="navbar-link" style={{ textDecoration: "none", color: "var(--text-h)" }}>Login</Link>
                            <Link to="/register" className="navbar-link" style={{ textDecoration: "none", color: "var(--text-h)" }}>Register</Link>
                        </div>
                    )}

                    <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                        ☰
                    </button>
                </div>
            </div>

            {/* Bottom row (Row 2) */}
            <div className={`navbar-bottom ${menuOpen ? "open" : ""}`}>
                <div className="navbar-links">
                    {!role && (
                        <>
                            <NavLink to="/" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"} end>Home</NavLink>
                            <NavLink to="/courses" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Courses</NavLink>
                            <NavLink to="/" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Mentors</NavLink>
                        </>
                    )}

                    {role === "student" && (
                        <>
                            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Dashboard</NavLink>
                            <NavLink to="/courses" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Courses</NavLink>
                            <NavLink to="/progress" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>My Progress</NavLink>
                            <NavLink to="/payment-history" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Payment History</NavLink>
                            <NavLink to="/notifications" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Notifications</NavLink>
                        </>
                    )}

                    {role === "mentor" && (
                        <>
                            <NavLink to="/mentor" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Dashboard</NavLink>
                            <NavLink to="/mentor/create-course" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Create Course</NavLink>
                        </>
                    )}

                    {role === "admin" && (
                        <>
                            <NavLink to="/admin" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Dashboard</NavLink>
                            <NavLink to="/admin/pending-mentors" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Mentor Approvals</NavLink>
                            <NavLink to="/admin/enrollments" className={({ isActive }) => isActive ? "navbar-link navbar-active" : "navbar-link"}>Pending Enrollments</NavLink>
                        </>
                    )}
                </div>

                {role && (
                    <div className="navbar-search-container" ref={navSuggestionRef}>
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
                                className="navbar-search-input"
                            />
                        </form>
                        {showNavSuggestions && navSuggestions && (
                            <div className="navbar-suggestions-dropdown">
                                {navSuggestions.courses.length > 0 && (
                                    <div className="navbar-suggestions-section">
                                        <div className="navbar-suggestions-header">Courses</div>
                                        {navSuggestions.courses.map(c => (
                                            <Link 
                                                key={c.id} 
                                                to={`/courses/${c.id}`}
                                                className="navbar-suggestion-item"
                                                onClick={() => setShowNavSuggestions(false)}
                                                style={{ textDecoration: "none" }}
                                            >
                                                📖 {c.title}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                                {navSuggestions.mentors.length > 0 && (
                                    <div className="navbar-suggestions-section">
                                        <div className="navbar-suggestions-header">Mentors</div>
                                        {navSuggestions.mentors.map(m => (
                                            <div 
                                                key={m.id} 
                                                onClick={() => {
                                                    navigate(`/search?q=${encodeURIComponent(m.username)}`);
                                                    setShowNavSuggestions(false);
                                                }}
                                                className="navbar-suggestion-item clickable"
                                            >
                                                👨‍🏫 {m.username}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {navSuggestions.courses.length === 0 && navSuggestions.mentors.length === 0 && (
                                    <div className="navbar-suggestions-empty">Press Enter to search</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;