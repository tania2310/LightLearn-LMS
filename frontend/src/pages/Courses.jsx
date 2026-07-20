import { useEffect, useState, useRef } from "react";
import API, { searchCourses, autocomplete } from "../api/api";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import "../styles/Courses.css";

function Courses() {
    const [courses, setCourses] = useState([]);
    const [search, setSearch] = useState("");
    const [ordering, setOrdering] = useState("");
    const [enrollments, setEnrollments] = useState([]);
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("access");
        if (token) {
            Promise.all([
                API.get("enrollments/").catch(() => ({ data: [] })),
                API.get("payments/history/").catch(() => ({ data: [] }))
            ]).then(([enrollRes, payRes]) => {
                setEnrollments(enrollRes.data);
                setPayments(payRes.data);
            }).catch(console.log);
        }
    }, []);
    
    // Filters state
    const [category, setCategory] = useState("");
    const [level, setLevel] = useState("");
    const [language, setLanguage] = useState("");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [maxDuration, setMaxDuration] = useState("");
    const [minRating, setMinRating] = useState("");

    // Autocomplete state
    const [suggestions, setSuggestions] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef(null);

    // List of static filter choices
    const categories = ["Programming", "Languages", "Business", "Design", "Marketing", "Music", "Photography"];
    const levels = ["beginner", "intermediate", "advanced"];
    const languages = ["English", "Spanish", "French", "German", "Hindi"];

    // Fetch matching courses with queries/filters/ordering
    const fetchFilteredCourses = () => {
        const params = {
            q: search,
            ordering,
            category,
            level,
            language,
            min_price: minPrice,
            max_price: maxPrice,
            max_duration: maxDuration,
            min_rating: minRating
        };
        searchCourses(params)
            .then((res) => {
                setCourses(res.data);
            })
            .catch(console.error);
    };

    useEffect(() => {
        fetchFilteredCourses();
    }, [search, ordering, category, level, language, minPrice, maxPrice, maxDuration, minRating]);

    // Handle autocomplete query fetching
    useEffect(() => {
        if (!search) {
            setSuggestions(null);
            return;
        }
        const delayDebounce = setTimeout(() => {
            autocomplete(search)
                .then(res => {
                    setSuggestions(res.data);
                })
                .catch(console.error);
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [search]);

    // Close suggestions dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const resetFilters = () => {
        setCategory("");
        setLevel("");
        setLanguage("");
        setMinPrice("");
        setMaxPrice("");
        setMaxDuration("");
        setMinRating("");
        setSearch("");
        setOrdering("");
    };

    return (
        <>
            <Navbar />
            <div className="courses-page" style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
                
                <h1 style={{ marginBottom: "30px", color: "var(--text-h)" }}>Explore Courses</h1>

                {/* Top Search Area & Autocomplete */}
                <div style={{ position: "relative", marginBottom: "30px" }} ref={suggestionRef}>
                    <input
                        className="search-box"
                        type="text"
                        placeholder="Search courses by title, tags, description, or mentor name..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        style={{ width: "100%", padding: "14px 20px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "1rem" }}
                    />
                    
                    {showSuggestions && suggestions && (
                        <div style={{
                            position: "absolute",
                            top: "55px",
                            left: "0",
                            width: "100%",
                            background: "var(--card-bg, #ffffff)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            zIndex: 1100,
                            maxHeight: "350px",
                            overflowY: "auto"
                        }}>
                            {suggestions.courses.length > 0 && (
                                <div style={{ padding: "10px 15px" }}>
                                    <div style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: "600", textTransform: "uppercase", marginBottom: "5px" }}>Courses</div>
                                    {suggestions.courses.map(c => (
                                        <Link 
                                            key={c.id} 
                                            to={`/courses/${c.id}`}
                                            style={{ display: "block", padding: "6px 0", color: "var(--text-h)", textDecoration: "none", fontSize: "0.9rem" }}
                                            onClick={() => setShowSuggestions(false)}
                                        >
                                            📖 {c.title}
                                        </Link>
                                    ))}
                                </div>
                            )}
                            {suggestions.mentors.length > 0 && (
                                <div style={{ padding: "10px 15px", borderTop: "1px solid var(--border)" }}>
                                    <div style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: "600", textTransform: "uppercase", marginBottom: "5px" }}>Mentors</div>
                                    {suggestions.mentors.map(m => (
                                        <div 
                                            key={m.id} 
                                            onClick={() => {
                                                setSearch(m.username);
                                                setShowSuggestions(false);
                                            }}
                                            style={{ cursor: "pointer", padding: "6px 0", color: "var(--text-h)", fontSize: "0.9rem" }}
                                        >
                                            👨‍🏫 {m.username}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {suggestions.categories.length > 0 && (
                                <div style={{ padding: "10px 15px", borderTop: "1px solid var(--border)" }}>
                                    <div style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: "600", textTransform: "uppercase", marginBottom: "5px" }}>Categories</div>
                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                        {suggestions.categories.map(cat => (
                                            <span 
                                                key={cat}
                                                onClick={() => {
                                                    setCategory(cat);
                                                    setShowSuggestions(false);
                                                }}
                                                style={{ cursor: "pointer", background: "var(--bg)", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", color: "var(--text-h)" }}
                                            >
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {suggestions.tags.length > 0 && (
                                <div style={{ padding: "10px 15px", borderTop: "1px solid var(--border)" }}>
                                    <div style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: "600", textTransform: "uppercase", marginBottom: "5px" }}>Tags</div>
                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                        {suggestions.tags.map(tag => (
                                            <span 
                                                key={tag}
                                                onClick={() => {
                                                    setSearch(tag);
                                                    setShowSuggestions(false);
                                                }}
                                                style={{ cursor: "pointer", background: "var(--hover-bg, rgba(124, 58, 237, 0.05))", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", color: "#7c3aed", fontWeight: "500" }}
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {suggestions.courses.length === 0 && suggestions.mentors.length === 0 && suggestions.categories.length === 0 && suggestions.tags.length === 0 && (
                                <div style={{ padding: "15px", textAlign: "center", color: "var(--text)", fontSize: "0.9rem" }}>No suggestions found</div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", gap: "30px", alignItems: "flex-start" }}>
                    
                    {/* Filter Sidebar */}
                    <div style={{
                        width: "280px",
                        background: "var(--card-bg, #ffffff)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "20px",
                        flexShrink: 0
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h3 style={{ margin: "0" }}>Filters</h3>
                            <button onClick={resetFilters} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.85rem", fontWeight: "500" }}>
                                Reset All
                            </button>
                        </div>

                        {/* Category filter */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Level filter */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>Difficulty Level</label>
                            <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                                <option value="">All Levels</option>
                                {levels.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                            </select>
                        </div>

                        {/* Language filter */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>Language</label>
                            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                                <option value="">All Languages</option>
                                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                        </div>

                        {/* Price Range filter */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>Price Range ($)</label>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                <input 
                                    type="number" 
                                    placeholder="Min" 
                                    value={minPrice} 
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                                />
                                <span>-</span>
                                <input 
                                    type="number" 
                                    placeholder="Max" 
                                    value={maxPrice} 
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                                />
                            </div>
                        </div>

                        {/* Max Duration filter */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>Max Duration: {maxDuration || "Any"} hrs</label>
                            <input 
                                type="range" 
                                min="1" 
                                max="40" 
                                value={maxDuration} 
                                onChange={(e) => setMaxDuration(e.target.value)}
                                style={{ width: "100%" }}
                            />
                        </div>

                        {/* Min Rating filter */}
                        <div>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem" }}>Min Rating</label>
                            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                                <option value="">Any Rating</option>
                                <option value="4.5">⭐⭐⭐⭐⭐ 4.5 & up</option>
                                <option value="4.0">⭐⭐⭐⭐ 4.0 & up</option>
                                <option value="3.0">⭐⭐⭐ 3.0 & up</option>
                                <option value="2.0">⭐⭐ 2.0 & up</option>
                            </select>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <span style={{ color: "var(--text)" }}>Found <strong>{courses.length}</strong> courses</span>
                            
                            {/* Sort Dropdown */}
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "0.9rem", color: "var(--text)" }}>Sort by:</span>
                                <select 
                                    value={ordering} 
                                    onChange={(e) => setOrdering(e.target.value)}
                                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--card-bg)" }}
                                >
                                    <option value="">Relevance</option>
                                    <option value="price">Price: Low to High</option>
                                    <option value="-price">Price: High to Low</option>
                                    <option value="-rating">Rating: High to Low</option>
                                    <option value="duration">Duration: Short to Long</option>
                                    <option value="-created_at">Newly Released</option>
                                </select>
                            </div>
                        </div>

                        {/* Courses Grid */}
                        <div className="course-grid">
                            {courses.length === 0 ? (
                                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0" }}>
                                    <h3>No matching courses found. Try modifying your search or filter inputs.</h3>
                                </div>
                            ) : (
                                courses.map((course) => (
                                    <div className="course-card" key={course.id}>
                                        <h2>{course.title}</h2>
                                        <p className="mentor">👨‍🏫 {course.mentor_name || course.mentor}</p>
                                        <p>
                                            {course.description.length > 100
                                                ? course.description.slice(0, 100) + "..."
                                                : course.description}
                                        </p>
                                        <div className="course-info">
                                            <span>⭐ {course.average_rating || "N/A"}</span>
                                            <span style={{ textTransform: "capitalize" }}>{course.level}</span>
                                        </div>
                                        <div className="course-info">
                                            <span>{course.duration} hrs</span>
                                            <span>${course.price}</span>
                                        </div>
                                        {(() => {
                                            const enrollment = enrollments.find(e => e.course === course.id);
                                            if (enrollment) {
                                                const paidPayment = payments.find(p => (p.enrollment === enrollment.id || p.enrollment_id === enrollment.id) && p.status === "Paid");
                                                const isPaid = !!paidPayment || Number(course.price) <= 0;

                                                return (
                                                    <div className="course-card-actions">
                                                        <Link to={`/courses/${course.id}`} className="details-btn">
                                                            View Details
                                                        </Link>
                                                        {enrollment.status === "pending" ? (
                                                            <span className="course-status-badge pending">
                                                                Waiting for Admin Approval
                                                            </span>
                                                        ) : enrollment.status === "rejected" ? (
                                                            <span className="course-status-badge rejected">
                                                                Enrollment Rejected
                                                            </span>
                                                        ) : !isPaid ? (
                                                            <Link to={`/checkout/${course.id}`} className="details-btn continue" style={{ backgroundColor: "#22c55e" }}>
                                                                Make Payment
                                                            </Link>
                                                        ) : (
                                                            <Link to={`/courses/${course.id}/modules`} className="details-btn continue">
                                                                Continue Learning
                                                            </Link>
                                                        )}
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <Link to={`/courses/${course.id}`} className="details-btn">
                                                        View Details
                                                    </Link>
                                                );
                                            }
                                        })()}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Courses;