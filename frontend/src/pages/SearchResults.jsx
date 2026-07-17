import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { searchCourses, searchMentors } from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/Courses.css";

function SearchResults() {
    const [searchParams, setSearchParams] = useSearchParams();
    const q = searchParams.get("q") || "";

    const [courses, setCourses] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [activeTab, setActiveTab] = useState("courses");
    const [searchQuery, setSearchQuery] = useState(q);

    const executeSearch = () => {
        if (!q) return;

        searchCourses({ q })
            .then(res => setCourses(res.data))
            .catch(console.error);

        searchMentors({ q })
            .then(res => setMentors(res.data))
            .catch(console.error);
    };

    useEffect(() => {
        executeSearch();
    }, [q]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSearchParams({ q: searchQuery });
    };

    return (
        <>
            <Navbar />
            <div className="courses-page" style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}>
                
                <div style={{ marginBottom: "30px" }}>
                    <h1 style={{ margin: "0 0 10px 0", color: "var(--text-h)" }}>Search Results</h1>
                    <p style={{ color: "var(--text)", margin: "0 0 20px 0" }}>
                        Showing results for: <strong>"{q}"</strong>
                    </p>

                    <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px" }}>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Refine search query..."
                            style={{ flex: 1, padding: "12px 18px", borderRadius: "6px", border: "1px solid var(--border)" }}
                        />
                        <button type="submit" className="btn-primary-flow" style={{ padding: "12px 24px", cursor: "pointer" }}>
                            Search
                        </button>
                    </form>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid var(--border)", marginBottom: "35px" }}>
                    <button 
                        onClick={() => setActiveTab("courses")}
                        style={{
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "courses" ? "3px solid #7c3aed" : "3px solid transparent",
                            color: activeTab === "courses" ? "#7c3aed" : "var(--text)",
                            fontWeight: "600",
                            fontSize: "1.1rem",
                            padding: "10px 20px",
                            cursor: "pointer"
                        }}
                    >
                        Courses ({courses.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("mentors")}
                        style={{
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === "mentors" ? "3px solid #7c3aed" : "3px solid transparent",
                            color: activeTab === "mentors" ? "#7c3aed" : "var(--text)",
                            fontWeight: "600",
                            fontSize: "1.1rem",
                            padding: "10px 20px",
                            cursor: "pointer"
                        }}
                    >
                        Mentors ({mentors.length})
                    </button>
                </div>

                {/* Tab content */}
                {activeTab === "courses" ? (
                    <div className="course-grid">
                        {courses.length === 0 ? (
                            <h3 style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--text)", padding: "40px" }}>
                                No matching courses found.
                            </h3>
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
                                    <Link to={`/courses/${course.id}`} className="details-btn">
                                        View Details
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "25px" }}>
                        {mentors.length === 0 ? (
                            <h3 style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--text)", padding: "40px" }}>
                                No matching mentors found.
                            </h3>
                        ) : (
                            mentors.map((mentor) => (
                                <div 
                                    key={mentor.id} 
                                    style={{
                                        background: "var(--card-bg, #ffffff)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "8px",
                                        padding: "25px",
                                        boxShadow: "0 4px 6px rgba(0,0,0,0.02)"
                                    }}
                                >
                                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "15px" }}>
                                        <div style={{
                                            width: "45px",
                                            height: "45px",
                                            borderRadius: "50%",
                                            background: "#7c3aed",
                                            color: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "bold",
                                            fontSize: "1.2rem"
                                        }}>
                                            {mentor.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: "0" }}>{mentor.username}</h3>
                                            <span style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: "500" }}>Approved Mentor</span>
                                        </div>
                                    </div>
                                    <p style={{ color: "var(--text)", fontSize: "0.9rem", lineHeight: "1.5" }}>
                                        {mentor.biography || "No biography provided."}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

export default SearchResults;
