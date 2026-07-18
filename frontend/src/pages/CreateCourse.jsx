import { useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import "../styles/CreateCourse.css";

function CreateCourse() {
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [level, setLevel] = useState("beginner");
    const [language, setLanguage] = useState("English");
    const [duration, setDuration] = useState("");
    const [price, setPrice] = useState("");
    const [thumbnail, setThumbnail] = useState(null);
    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();

        formData.append("title", title);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("level", level);
        formData.append("language", language);
        formData.append("duration", duration);
        formData.append("price", price);

        if (thumbnail) {
            formData.append("thumbnail", thumbnail);
        }

        API.post("courses/", formData)
            .then(() => {
                alert("Course submitted for approval.");
                navigate("/mentor");
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div className="dashboard-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
                <h1 style={{ marginBottom: "30px", color: "var(--text-primary)" }}>Create Course</h1>

                <div className="card">
                    <form onSubmit={handleSubmit} className="create-course-form-grid">
                        <div className="form-group create-course-full-width">
                            <label>Course Title</label>
                            <input
                                type="text"
                                placeholder="e.g. Introduction to Python"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group create-course-full-width">
                            <label>Description</label>
                            <textarea
                                rows="6"
                                placeholder="Describe the course content and goals..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        {/* Left Column */}
                        <div className="create-course-column">
                            <div className="form-group">
                                <label>Category</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Programming"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Thumbnail Image</label>
                                <div className="file-upload-wrapper">
                                    <button type="button" className="file-upload-btn">
                                        Choose File
                                    </button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setThumbnail(e.target.files[0])}
                                        className="file-upload-input"
                                    />
                                    <span className="file-upload-filename">
                                        {thumbnail ? thumbnail.name : "No file chosen"}
                                    </span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Duration (hours)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 10"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="create-course-column">
                            <div className="form-group">
                                <label>Difficulty Level</label>
                                <select
                                    value={level}
                                    onChange={(e) => setLevel(e.target.value)}
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Language</label>
                                <input
                                    type="text"
                                    placeholder="e.g. English"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="e.g. 499.00"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="create-course-submit-container">
                            <button type="submit" className="primary-btn" style={{ minWidth: "200px" }}>
                                Create Course
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default CreateCourse;