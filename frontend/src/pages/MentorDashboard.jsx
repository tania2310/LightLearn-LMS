import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/MentorDashboard.css";

function MentorDashboard() {
    const [courses, setCourses] = useState([]);
    const approved = courses.filter(c => c.status === "approved").length;

    const pending = courses.filter(c => c.status === "pending").length;

    const rejected = courses.filter(c => c.status === "rejected").length;

    const drafts = courses.filter(c => c.status === "draft").length;

    const totalStudentsEnrolled = courses.reduce((sum, c) => sum + (c.enrolled_count || 0), 0);
    const ratedCourses = courses.filter(c => c.average_rating > 0);
    const averageRating = ratedCourses.length > 0 
        ? (ratedCourses.reduce((sum, c) => sum + c.average_rating, 0) / ratedCourses.length).toFixed(1)
        : "0.0";

    const totalModules = courses.reduce((sum, c) => sum + (c.modules || []).length, 0);
    const totalLessons = courses.reduce((sum, c) => sum + (c.modules || []).reduce((mSum, m) => mSum + (m.lessons || []).length, 0), 0);
    const totalRevenue = courses.reduce((sum, c) => sum + (c.enrolled_count || 0) * Number(c.price || 0), 0);
    const popularCourse = [...courses].sort((a, b) => (b.enrolled_count || 0) - (a.enrolled_count || 0))[0]?.title || "N/A";

    useEffect(() => {
        API.get("courses/")
            .then((response) => {
                setCourses(response.data);
            })
            .catch(console.log);
    }, []);

    const submitCourse = (id) => {
        API.post(`courses/${id}/submit-for-approval/`)
            .then(() => {
                alert("Course submitted for approval.");

                setCourses((prev) =>
                    prev.map((course) =>
                        course.id === id
                            ? { ...course, status: "pending" }
                            : course
                    )
                );
            })
            .catch(console.log);
    };
    const deleteCourse = (id) => {

        if (!window.confirm("Delete this course?")) return;

        API.delete(`courses/${id}/`)
            .then(() => {

                alert("Course deleted.");

                setCourses(prev =>
                    prev.filter(course => course.id !== id)
                );

            })
            .catch(console.log);

    };

    return (
        <>
            <Navbar />

            <div className="dashboard-container">
                <h1>Mentor Dashboard</h1>

                <Link to="/mentor/create-course">
                    <button className="primary-btn">Create Course</button>
                </Link>

                <hr />
                <div className="stats">

                    <div className="card">
                        <h2>{courses.length}</h2>
                        <p>Total Courses</p>
                    </div>

                    <div className="card">
                        <h2>{drafts}</h2>
                        <p>Drafts</p>
                    </div>

                    <div className="card">
                        <h2>{approved}</h2>
                        <p>Approved</p>
                    </div>

                    <div className="card">
                        <h2>{pending}</h2>
                        <p>Pending</p>
                    </div>

                    <div className="card">
                        <h2>{rejected}</h2>
                        <p>Rejected</p>
                    </div>

                    <div className="card">
                        <h2>{totalStudentsEnrolled}</h2>
                        <p>Enrolled Students</p>
                    </div>

                    <div className="card">
                        <h2>{averageRating} ⭐</h2>
                        <p>Avg Course Rating</p>
                    </div>

                    <div className="card">
                        <h2>{totalModules}</h2>
                        <p>Total Modules</p>
                    </div>

                    <div className="card">
                        <h2>{totalLessons}</h2>
                        <p>Total Lessons</p>
                    </div>

                    <div className="card">
                        <h2>₹{totalRevenue.toLocaleString()}</h2>
                        <p>Estimated Revenue</p>
                    </div>

                    <div className="card">
                        <h2 style={{ fontSize: "1.1rem", padding: "10px 0" }}>{popularCourse}</h2>
                        <p>Most Popular Course</p>
                    </div>

                </div>

                <h2>My Courses</h2>

                {courses.length === 0 ? (
                    <p>No courses yet.</p>
                ) : (
                    courses.map((course) => (
                        <div
                            key={course.id}
                            className="course-card"
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

                                <p>
                                    <strong>Category:</strong> {course.category}
                                </p>

                                <p>
                                    <strong>Level:</strong> {course.level}
                                </p>

                                <p>
                                    <strong>Duration:</strong> {course.duration} hrs
                                </p>

                                <p>
                                    <strong>Price:</strong> ₹{course.price}
                                </p>

                                <p>
                                    <strong>Status:</strong>{" "}
                                    <span className={`status ${course.status}`}>
                                        {course.status === "draft"
                                            ? "Draft"
                                            : course.status === "pending"
                                            ? "Pending Approval"
                                            : course.status === "approved"
                                            ? "Approved"
                                            : course.status === "rejected"
                                            ? "Rejected"
                                            : course.status}
                                    </span>
                                </p>

                                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "15px" }}>
                                    <Link to={`/mentor/course/${course.id}/edit`}>
                                        <button className="primary-btn">Edit</button>
                                    </Link>

                                    <Link to={`/courses/${course.id}/modules`}>
                                        <button className="primary-btn">
                                            Manage Modules
                                        </button>
                                    </Link>

                                    <button
                                        className="primary-btn"
                                        onClick={() => deleteCourse(course.id)}
                                    >
                                        Delete
                                    </button>

                                    {course.status === "draft" && (
                                        <button
                                            className="primary-btn"
                                            onClick={() => submitCourse(course.id)}
                                        >
                                            Submit for Approval
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    ))
                )}

            </div >

        </>
    );
}

export default MentorDashboard;