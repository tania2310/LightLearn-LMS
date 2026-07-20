import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/EditCourse.css";

function EditCourse() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState({
        title: "",
        description: "",
        category: "",
        level: "beginner",
        language: "",
        duration: "",
        price: "",
    });

    useEffect(() => {
        API.get(`courses/${id}/`)
            .then((response) => {
                setCourse(response.data);
            })
            .catch(console.log);
    }, [id]);

    const handleChange = (e) => {
        setCourse({
            ...course,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        API.put(`courses/${id}/`, course)
            .then(() => {
                alert("Course updated successfully.");
                navigate("/mentor");
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div className="dashboard-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
                <h1 style={{ marginBottom: "30px", color: "var(--text-primary)" }}>Edit Course</h1>

                <div className="card">
                    <form onSubmit={handleSubmit} className="edit-course-form-grid">
                        <div className="form-group edit-course-full-width">
                            <label>Course Title</label>
                            <input
                                name="title"
                                type="text"
                                value={course.title || ""}
                                onChange={handleChange}
                                placeholder="Title"
                                required
                            />
                        </div>

                        <div className="form-group edit-course-full-width">
                            <label>Description</label>
                            <textarea
                                name="description"
                                rows="6"
                                value={course.description || ""}
                                onChange={handleChange}
                                placeholder="Describe the course content and goals..."
                                required
                            />
                        </div>

                        {/* Left Column */}
                        <div className="edit-course-column">
                            <div className="form-group">
                                <label>Category</label>
                                <input
                                    name="category"
                                    type="text"
                                    value={course.category || ""}
                                    onChange={handleChange}
                                    placeholder="Category"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Duration (hours)</label>
                                <input
                                    type="number"
                                    name="duration"
                                    value={course.duration || ""}
                                    onChange={handleChange}
                                    placeholder="Duration"
                                    required
                                />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="edit-course-column">
                            <div className="form-group">
                                <label>Difficulty Level</label>
                                <select
                                    name="level"
                                    value={course.level || "beginner"}
                                    onChange={handleChange}
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Language</label>
                                <input
                                    name="language"
                                    type="text"
                                    value={course.language || ""}
                                    onChange={handleChange}
                                    placeholder="Language"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="price"
                                    value={course.price || ""}
                                    onChange={handleChange}
                                    placeholder="Price"
                                    required
                                />
                            </div>
                        </div>

                        <div className="edit-course-submit-container">
                            <button type="submit" className="primary-btn" style={{ minWidth: "200px" }}>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default EditCourse;