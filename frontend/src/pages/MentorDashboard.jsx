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

    useEffect(() => {
        API.get("courses/")
            .then((response) => {
                setCourses(response.data);
            })
            .catch(console.log);
    }, []);

    const submitCourse = (id) => {
        API.post(`courses/${id}/submit/`)
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

            <div className="dashboard">
                <h1>Mentor Dashboard</h1>

                <Link to="/mentor/create-course">
                    <button>Create Course</button>
                </Link>

                <hr />
                <div className="stats">

                    <div className="card">
                        <h2>{courses.length}</h2>
                        <p>Total Courses</p>
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
                                        {course.status}
                                    </span>
                                </p>

                                <div style={{ marginTop: "15px" }}>
                                    <Link to={`/mentor/course/${course.id}/edit`}>
                                        <button>Edit</button>
                                    </Link>

                                    <Link to={`/courses/${course.id}/modules`}>
                                        <button
                                            style={{
                                                marginLeft: "10px",
                                                background: "#2563eb",
                                                color: "white",
                                            }}
                                        >
                                            Manage Modules
                                        </button>
                                    </Link>

                                    <button
                                        style={{
                                            background: "#dc3545",
                                            color: "white",
                                            marginLeft: "10px",
                                        }}
                                        onClick={() => deleteCourse(course.id)}
                                    >
                                        Delete
                                    </button>

                                    {" "}

                                    {course.status === "draft" && (
                                        <button
                                            onClick={() => submitCourse(course.id)}
                                            style={{ marginLeft: "10px" }}
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