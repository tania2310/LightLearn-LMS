import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";

function PendingEnrollments() {
    const [enrollments, setEnrollments] = useState([]);

    useEffect(() => {
        API.get("enrollments/")
            .then((response) => {
                const pending = response.data.filter(
                    (e) => e.status === "pending"
                );

                setEnrollments(pending);
            })
            .catch(console.log);
    }, []);

    const approveEnrollment = (id) => {
        API.post(`enrollments/approve/${id}/`)
            .then(() => {
                alert("Enrollment Approved!");

                setEnrollments((prev) =>
                    prev.filter((e) => e.id !== id)
                );
            })
            .catch(console.log);
    };

    const rejectEnrollment = (id) => {
        API.post(`enrollments/reject/${id}/`)
            .then(() => {
                alert("Enrollment Rejected!");

                setEnrollments((prev) =>
                    prev.filter((e) => e.id !== id)
                );
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div className="dashboard-container">
                <h1 style={{ marginBottom: "30px", color: "var(--text-primary)" }}>Pending Enrollments</h1>

                {enrollments.length === 0 ? (
                    <p className="empty-placeholder-msg">No pending enrollments.</p>
                ) : (
                    <div className="stats-grid">
                        {enrollments.map((enrollment) => (
                            <div className="card" key={enrollment.id} style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div className="avatar">
                                        🎓
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{enrollment.course_title}</h3>
                                        <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Student ID: {enrollment.student}</p>
                                        <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "10px" }}>
                                    <button
                                        className="primary-btn"
                                        onClick={() => approveEnrollment(enrollment.id)}
                                        style={{ flex: 1 }}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className="secondary-btn"
                                        onClick={() => rejectEnrollment(enrollment.id)}
                                        style={{ flex: 1, background: "var(--danger)" }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default PendingEnrollments;