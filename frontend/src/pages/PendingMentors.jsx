import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";

function PendingMentors() {
    const [mentors, setMentors] = useState([]);

    useEffect(() => {
        API.get("accounts/pending-mentors/")
            .then((res) => {
                setMentors(res.data);
            })
            .catch(console.log);
    }, []);

    const approveMentor = (id) => {
        API.post(`accounts/approve-mentor/${id}/`)
            .then(() => {
                alert("Mentor Approved!");

                setMentors((prev) =>
                    prev.filter((mentor) => mentor.id !== id)
                );
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div className="dashboard-container">
                <h1 style={{ marginBottom: "30px", color: "var(--text-primary)" }}>Pending Mentor Approvals</h1>

                {mentors.length === 0 ? (
                    <p className="empty-placeholder-msg">No pending mentors.</p>
                ) : (
                    <div className="stats-grid">
                        {mentors.map((mentor) => (
                            <div className="card" key={mentor.id} style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div className="avatar">
                                        {mentor.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{mentor.username}</h3>
                                        <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>{mentor.email}</p>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "10px" }}>
                                    <button
                                        className="primary-btn"
                                        onClick={() => approveMentor(mentor.id)}
                                        style={{ width: "100%" }}
                                    >
                                        Approve
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

export default PendingMentors;