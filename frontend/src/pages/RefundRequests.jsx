import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/learningFlow.css";
import "../styles/learningFlowExtras.css";

function RefundRequests() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get("refunds/")
            .then(res => {
                setRequests(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching refund requests:", err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ padding: "40px", textAlign: "center" }}>
                    <h3>Loading Refund Requests...</h3>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="qa-container">
                <div style={{ marginBottom: "25px" }}>
                    <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
                        ← Back to Dashboard
                    </button>
                </div>

                <div className="qa-header">
                    <h1>My Refund Requests</h1>
                    <p style={{ color: "var(--text)" }}>View the status of your submitted refund requests.</p>
                </div>

                <div className="admin-table-container" style={{ marginTop: "30px" }}>
                    {requests.length === 0 ? (
                        <p style={{ textAlign: "center", color: "var(--text)", padding: "20px" }}>
                            You have not submitted any refund requests.
                        </p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Reason</th>
                                    <th>Requested Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => {
                                    const dateStr = req.requested_at 
                                        ? new Date(req.requested_at).toLocaleDateString()
                                        : "N/A";
                                    
                                    let statusClass = "unanswered";
                                    if (req.status === "Approved") statusClass = "answered";
                                    if (req.status === "Rejected") statusClass = "incomplete";

                                    return (
                                        <tr key={req.id}>
                                            <td><strong>{req.course_title || `Course #${req.course_id}`}</strong></td>
                                            <td>{req.reason}</td>
                                            <td>{dateStr}</td>
                                            <td>
                                                <span className={`qa-status-badge ${statusClass}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}

export default RefundRequests;
