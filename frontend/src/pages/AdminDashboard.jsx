import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/MentorDashboard.css";

function AdminDashboard() {
    const [courses, setCourses] = useState([]);
    const [stats, setStats] = useState({});

    useEffect(() => {
        Promise.all([
            API.get("courses/pending/"),
            API.get("admin/stats/")
        ])
            .then(([courseRes, statRes]) => {
                setCourses(courseRes.data);
                setStats(statRes.data);
            })
            .catch(console.log);
    }, []);

    const approve = (id) => {

        API.post(`courses/${id}/approve/`)

            .then(() => {

                alert("Course Approved");

                setCourses(prev =>
                    prev.filter(course => course.id !== id)
                );

                setStats(prev => ({
                    ...prev,
                    pending: prev.pending - 1,
                }));

            })

            .catch(console.log);

    };

    const reject = (id) => {

        API.post(`courses/${id}/reject/`)

            .then(() => {

                alert("Course Rejected");

                setCourses(prev =>
                    prev.filter(course => course.id !== id)
                );

                setStats(prev => ({
                    ...prev,
                    pending: prev.pending - 1,
                }));

            })

            .catch(console.log);

    };

    return (
        <>
            <Navbar />

            <div className="dashboard">

                <h1>Admin Dashboard</h1>
                <div className="stats">

                    <div className="card">
                        <h2>{stats.users}</h2>
                        <p>Total Users</p>
                    </div>

                    <div className="card">
                        <h2>{stats.students}</h2>
                        <p>Students</p>
                    </div>

                    <div className="card">
                        <h2>{stats.mentors}</h2>
                        <p>Mentors</p>
                    </div>

                    <div className="card">
                        <h2>{stats.courses}</h2>
                        <p>Courses</p>
                    </div>

                    <div className="card">
                        <h2>{stats.pending}</h2>
                        <p>Pending</p>
                    </div>

                </div>

                <h2 style={{ marginTop: "40px" }}>
                    Pending Courses
                </h2>

                {courses.length === 0 ? (

                    <p>No pending courses.</p>

                ) : (

                    courses.map(course => (

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
                                    <strong>Mentor:</strong> {course.mentor}
                                </p>

                                <p>
                                    <strong>Category:</strong> {course.category}
                                </p>

                                <p>
                                    <strong>Level:</strong> {course.level}
                                </p>

                                <p>
                                    <strong>Status:</strong> {course.status}
                                </p>

                                <button
                                    onClick={() => approve(course.id)}
                                >
                                    Approve
                                </button>

                                {" "}

                                <button
                                    onClick={() => reject(course.id)}
                                >
                                    Reject
                                </button>

                            </div>

                        </div>

                    ))

                )}

            </div>

        </>
    );
}

export default AdminDashboard;