import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/learningFlow.css";
import "../styles/learningFlowExtras.css";

function Search() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setSearched(true);
        // Reuse the exact search endpoint "/api/courses/?search="
        API.get(`courses/?search=${searchQuery}`)
            .then(res => {
                setCourses(res.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Search error:", err);
                setLoading(false);
            });
    };

    return (
        <>
            <Navbar />
            <div className="search-container">
                <div className="search-header">
                    <h1>Search Courses</h1>
                    <form onSubmit={handleSearch} className="search-input-wrapper">
                        <input
                            type="text"
                            className="search-bar"
                            placeholder="Search course titles or categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="btn-primary-flow">
                            Search
                        </button>
                    </form>
                </div>

                <div className="search-results">
                    {loading && (
                        <div style={{ textAlign: "center", padding: "40px" }}>
                            <h3>Searching for courses...</h3>
                        </div>
                    )}

                    {!loading && searched && courses.length === 0 && (
                        <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "12px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🔍</div>
                            <h2>No Results Found</h2>
                            <p style={{ color: "var(--text)" }}>We couldn't find any courses matching "{searchQuery}". Try a different keyword.</p>
                        </div>
                    )}

                    {!loading && courses.map(course => (
                        <div 
                            key={course.id} 
                            className="course-card" 
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/courses/${course.id}`)}
                        >
                            {course.thumbnail && (
                                <img
                                    src={`http://127.0.0.1:8000${course.thumbnail}`}
                                    alt={course.title}
                                />
                            )}
                            <div className="course-info">
                                <h2>{course.title}</h2>
                                <p>{course.description}</p>
                                <p><strong>Mentor:</strong> {course.mentor}</p>
                                <p><strong>Category:</strong> {course.category}</p>
                                <p><strong>Level:</strong> {course.level}</p>
                                <p><strong>Status:</strong> {course.status}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export default Search;
