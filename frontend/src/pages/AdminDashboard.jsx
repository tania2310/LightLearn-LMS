import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/AdminDashboard.css";

function AdminDashboard() {
    const [courses, setCourses] = useState([]);
    const [stats, setStats] = useState({});
    const [pendingMentors, setPendingMentors] = useState([]);
    const [users, setUsers] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [payments, setPayments] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const pendingRefundsCount = refunds.filter(r => r.status === "Pending").length;

    const fetchAllData = () => {
        setLoading(true);
        Promise.all([
            API.get("courses/pending/"),
            API.get("admin/stats/"),
            API.get("accounts/pending-mentors/"),
            API.get("accounts/admin/users/"),
            API.get("reviews/"),
            API.get("refunds/").catch(() => ({ data: [] })),
            API.get("payments/history/").catch(() => ({ data: [] })),
            API.get("reviews/reports/").catch(() => ({ data: [] }))
        ])
            .then(([courseRes, statRes, mentorRes, usersRes, reviewsRes, refundsRes, paymentsRes, reportsRes]) => {
                setCourses(courseRes.data);
                setStats(statRes.data);
                setPendingMentors(mentorRes.data);
                setUsers(usersRes.data);
                setReviews(reviewsRes.data);
                setRefunds(refundsRes.data);
                setPayments(paymentsRes.data || []);
                setReports(reportsRes.data || []);
            })
            .catch(console.log)
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Course Approval Actions
    const approve = (id) => {
        API.post(`courses/${id}/approve/`)
            .then(() => {
                alert("Course Approved");
                setCourses(prev => prev.filter(course => course.id !== id));
                setStats(prev => ({
                    ...prev,
                    pending: (prev.pending || 1) - 1,
                    approved: (prev.approved || 0) + 1
                }));
            })
            .catch(console.log);
    };

    const reject = (id) => {
        API.post(`courses/${id}/reject/`)
            .then(() => {
                alert("Course Rejected");
                setCourses(prev => prev.filter(course => course.id !== id));
                setStats(prev => ({
                    ...prev,
                    pending: (prev.pending || 1) - 1,
                    rejected: (prev.rejected || 0) + 1
                }));
            })
            .catch(console.log);
    };

    const refundPayment = (paymentId) => {
        if (!window.confirm("Are you sure you want to refund this payment via the provider?")) return;
        API.post(`payments/refund/${paymentId}/`)
            .then(() => {
                alert("Refund processed successfully and enrollment access revoked.");
                fetchAllData();
            })
            .catch(err => {
                console.error(err);
                alert("Failed to refund payment via provider.");
            });
    };

    const hideReview = (reviewId) => {
        if (!window.confirm("Hide this review from student dashboards?")) return;
        API.post(`reviews/${reviewId}/hide/`)
            .then(() => {
                alert("Review hidden.");
                fetchAllData();
            })
            .catch(console.log);
    };

    const restoreReview = (reviewId) => {
        API.post(`reviews/${reviewId}/restore/`)
            .then(() => {
                alert("Review restored.");
                fetchAllData();
            })
            .catch(console.log);
    };

    const dismissReport = (reportId) => {
        API.post(`reviews/reports/${reportId}/dismiss/`)
            .then(() => {
                alert("Abuse report dismissed.");
                fetchAllData();
            })
            .catch(console.log);
    };

    const markReportReviewed = (reportId) => {
        API.post(`reviews/reports/${reportId}/reviewed/`)
            .then(() => {
                alert("Abuse report marked as reviewed.");
                fetchAllData();
            })
            .catch(console.log);
    };

    const approveRefund = (id) => {
        const req = refunds.find(r => r.id === id);
        const paidPayment = req && payments.find(p => p.enrollment === req.enrollment && p.status === "Paid");

        if (paidPayment) {
            if (window.confirm("This refund request is linked to a paid transaction. Refund via Stripe/PayPal provider?")) {
                refundPayment(paidPayment.id);
                return;
            }
        }

        API.post(`refunds/${id}/approve/`)
            .then(() => {
                alert("Refund request approved successfully.");
                fetchAllData();
            })
            .catch(console.log);
    };

    const rejectRefund = (id) => {
        API.post(`refunds/${id}/reject/`)
            .then(() => {
                alert("Refund request rejected successfully.");
                fetchAllData();
            })
            .catch(console.log);
    };

    // Mentor Approval Actions
    const approveMentor = (id) => {
        API.post(`accounts/approve-mentor/${id}/`)
            .then(() => {
                alert("Mentor Approved!");
                setPendingMentors(prev => prev.filter(m => m.id !== id));
                // Update stats and refresh users
                setStats(prev => ({
                    ...prev,
                    approved_mentors: (prev.approved_mentors || 0) + 1,
                    pending_mentors: (prev.pending_mentors || 1) - 1
                }));
                // Reload users list
                API.get("accounts/admin/users/").then(res => setUsers(res.data)).catch(console.log);
            })
            .catch(console.log);
    };

    const rejectMentor = (id) => {
        if (!window.confirm("Reject and delete this mentor request?")) return;
        API.post(`accounts/reject-mentor/${id}/`)
            .then(() => {
                alert("Mentor Rejected (deleted).");
                setPendingMentors(prev => prev.filter(m => m.id !== id));
                setStats(prev => ({
                    ...prev,
                    pending_mentors: (prev.pending_mentors || 1) - 1
                }));
                // Reload users list
                API.get("accounts/admin/users/").then(res => setUsers(res.data)).catch(console.log);
            })
            .catch(console.log);
    };

    // Review Moderation Actions
    const deleteReview = (id) => {
        if (!window.confirm("Delete this review permanently?")) return;
        API.delete(`reviews/${id}/`)
            .then(() => {
                alert("Review deleted successfully.");
                setReviews(prev => prev.filter(r => r.id !== id));
            })
            .catch((err) => {
                console.log(err);
                alert("Failed to delete review.");
            });
    };

    // PDF Reports Downloads
    const downloadReport = (type) => {
        API.get(`admin/reports/?type=${type}`, { responseType: 'blob' })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${type}_report.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            })
            .catch((error) => {
                console.error("Error downloading report:", error);
                alert("Failed to download report.");
            });
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ padding: "40px", textAlign: "center" }}>
                    <h3>Loading Admin Dashboard...</h3>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />

            <div className="admin-dashboard">
                <h1>Admin Dashboard</h1>

                {/* Dashboard Statistics */}
                <div className="stats">
                    <div className="card">
                        <h2>{stats.users || 0}</h2>
                        <p>Total Users</p>
                    </div>

                    <div className="card">
                        <h2>{stats.students || 0}</h2>
                        <p>Students</p>
                    </div>

                    <div className="card">
                        <h2>{stats.mentors || 0}</h2>
                        <p>Mentors</p>
                    </div>

                    <div className="card">
                        <h2>{stats.approved_mentors || 0}</h2>
                        <p>Approved Mentors</p>
                    </div>

                    <div className="card">
                        <h2>{stats.pending_mentors || 0}</h2>
                        <p>Pending Mentors</p>
                    </div>

                    <div className="card">
                        <h2>{stats.courses || 0}</h2>
                        <p>Total Courses</p>
                    </div>

                    <div className="card">
                        <h2>{stats.approved || 0}</h2>
                        <p>Approved Courses</p>
                    </div>

                    <div className="card">
                        <h2>{stats.pending || 0}</h2>
                        <p>Pending Courses</p>
                    </div>

                    <div className="card">
                        <h2>{stats.rejected || 0}</h2>
                        <p>Rejected Courses</p>
                    </div>

                    <div className="card">
                        <h2>{stats.enrollments || 0}</h2>
                        <p>Total Enrollments</p>
                    </div>

                    <div className="card">
                        <h2>{stats.certificates || 0}</h2>
                        <p>Total Certificates</p>
                    </div>

                    <div className="card">
                        <h2>{pendingRefundsCount}</h2>
                        <p>Pending Refunds</p>
                    </div>
                </div>

                {/* PDF Reports Section */}
                <h2 className="section-title">System PDF Reports</h2>
                <div className="reports-grid">
                    <div className="report-card">
                        <h3>Users List Report</h3>
                        <button onClick={() => downloadReport("users")} className="btn-report">
                            Download PDF
                        </button>
                    </div>
                    <div className="report-card">
                        <h3>Courses Catalog Report</h3>
                        <button onClick={() => downloadReport("courses")} className="btn-report">
                            Download PDF
                        </button>
                    </div>
                    <div className="report-card">
                        <h3>Enrollments History Report</h3>
                        <button onClick={() => downloadReport("enrollments")} className="btn-report">
                            Download PDF
                        </button>
                    </div>
                    <div className="report-card">
                        <h3>Certificates Registry Report</h3>
                        <button onClick={() => downloadReport("certificates")} className="btn-report">
                            Download PDF
                        </button>
                    </div>
                </div>

                {/* Pending Mentor Approvals Section */}
                <h2 className="section-title">Pending Mentor Approvals</h2>
                <div className="admin-table-container">
                    {pendingMentors.length === 0 ? (
                        <p>No pending mentors.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingMentors.map(mentor => (
                                    <tr key={mentor.id}>
                                        <td>{mentor.username}</td>
                                        <td>{mentor.email}</td>
                                        <td>
                                            <button 
                                                onClick={() => approveMentor(mentor.id)}
                                                className="btn-approve"
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => rejectMentor(mentor.id)}
                                                className="btn-reject"
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Existing Course Approvals Section */}
                <h2 className="section-title">Pending Courses</h2>
                {courses.length === 0 ? (
                    <p>No pending courses.</p>
                ) : (
                    courses.map(course => (
                        <div key={course.id} className="course-card">
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
                                <button onClick={() => approve(course.id)}>Approve</button>
                                <button onClick={() => reject(course.id)}>Reject</button>
                            </div>
                        </div>
                    ))
                )}

                {/* Recent Users List */}
                <h2 className="section-title">User Management</h2>
                <div className="admin-table-container">
                    {users.length === 0 ? (
                        <p>No users registered.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Verified</th>
                                    <th>Approved</th>
                                    <th>Date Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.username}</td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className={`badge-role ${u.role}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className={`badge-status ${u.is_email_verified ? 'yes' : 'no'}`}>
                                            {u.is_email_verified ? "Yes" : "No"}
                                        </td>
                                        <td className={`badge-status ${u.is_approved ? 'yes' : 'no'}`}>
                                            {u.is_approved ? "Yes" : "No"}
                                        </td>
                                        <td>{u.date_joined || "N/A"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Review Moderation Section */}
                <h2 className="section-title">Review Moderation</h2>
                <div className="admin-table-container">
                    {reviews.length === 0 ? (
                        <p>No reviews posted.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Course ID</th>
                                    <th>Rating</th>
                                    <th>Comment</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviews.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.student}</td>
                                        <td>{r.course}</td>
                                        <td>{r.rating} ⭐</td>
                                        <td>{r.comment}</td>
                                        <td>
                                            <button 
                                                onClick={() => deleteReview(r.id)}
                                                className="btn-reject"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Recent Payments Section */}
                <h2 className="section-title">Recent Payments</h2>
                <div className="admin-table-container" style={{ marginBottom: "25px" }}>
                    {payments.length === 0 ? (
                        <p>No payment transactions found.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Course</th>
                                    <th>Provider</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Transaction ID</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(payment => {
                                    const dateStr = payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "N/A";
                                    return (
                                        <tr key={payment.id}>
                                            <td><strong>{payment.student_username || `User #${payment.student}`}</strong></td>
                                            <td>{payment.course_title || `Course #${payment.course_id}`}</td>
                                            <td>{payment.provider}</td>
                                            <td>${payment.amount}</td>
                                            <td>
                                                <span style={{ 
                                                    padding: "2px 6px", 
                                                    borderRadius: "4px", 
                                                    fontSize: "0.85rem", 
                                                    fontWeight: "600",
                                                    backgroundColor: payment.status === "Paid" ? "#dcfce7" : (payment.status === "Pending" ? "#fef9c3" : (payment.status === "Failed" ? "#fee2e2" : "#f3f4f6")),
                                                    color: payment.status === "Paid" ? "#166534" : (payment.status === "Pending" ? "#854d0e" : (payment.status === "Failed" ? "#991b1b" : "#374151"))
                                                }}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                                                {payment.transaction_id || payment.payment_intent_id || "N/A"}
                                            </td>
                                            <td>{dateStr}</td>
                                            <td>
                                                {payment.status === "Paid" && (
                                                    <button 
                                                        onClick={() => refundPayment(payment.id)}
                                                        className="btn-reject"
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        Refund
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Recent Payment Disputes Section */}
                <h2 className="section-title">Recent Payment Disputes</h2>
                <div className="admin-table-container" style={{ marginBottom: "25px" }}>
                    {payments.filter(p => p.status === "Disputed").length === 0 ? (
                        <p>No disputed transactions found.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Course</th>
                                    <th>Provider</th>
                                    <th>Amount</th>
                                    <th>Disputed Date</th>
                                    <th>Dispute Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.filter(p => p.status === "Disputed").map(payment => {
                                    const dateStr = payment.disputed_at ? new Date(payment.disputed_at).toLocaleDateString() : "N/A";
                                    return (
                                        <tr key={payment.id}>
                                            <td><strong>{payment.student_username || `User #${payment.student}`}</strong></td>
                                            <td>{payment.course_title || `Course #${payment.course_id}`}</td>
                                            <td>{payment.provider}</td>
                                            <td>${payment.amount}</td>
                                            <td>{dateStr}</td>
                                            <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                                                {payment.dispute_reference || "N/A"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Refund Requests Moderation Section */}
                <h2 className="section-title">Refund Requests</h2>
                <div className="admin-table-container" style={{ marginBottom: "40px" }}>
                    {refunds.length === 0 ? (
                        <p>No refund requests pending review.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Course</th>
                                    <th>Reason</th>
                                    <th>Requested Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refunds.map(req => {
                                    const dateStr = req.requested_at
                                        ? new Date(req.requested_at).toLocaleDateString()
                                        : "N/A";
                                    return (
                                        <tr key={req.id}>
                                            <td><strong>{req.student_username || `User #${req.student}`}</strong></td>
                                            <td>{req.course_title || `Course #${req.course_id}`}</td>
                                            <td>{req.reason}</td>
                                            <td>{dateStr}</td>
                                            <td>
                                                <span className={`qa-status-badge ${req.status === "Approved" ? "answered" : (req.status === "Rejected" ? "incomplete" : "unanswered")}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td>
                                                {req.status === "Pending" && (
                                                    <div style={{ display: "flex", gap: "10px" }}>
                                                        <button 
                                                            onClick={() => approveRefund(req.id)}
                                                            className="btn-approve"
                                                            style={{ cursor: "pointer" }}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => rejectRefund(req.id)}
                                                            className="btn-reject"
                                                            style={{ cursor: "pointer" }}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Reported Reviews Moderation Section */}
                <h2 className="section-title">Reported Reviews</h2>
                <div className="admin-table-container" style={{ marginBottom: "40px" }}>
                    {reports.length === 0 ? (
                        <p>No review reports pending review.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Review</th>
                                    <th>Course</th>
                                    <th>Reporter</th>
                                    <th>Reason</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map(report => {
                                    const dateStr = report.created_at ? new Date(report.created_at).toLocaleDateString() : "N/A";
                                    const matchedReview = reviews.find(r => r.id === report.review);
                                    const isReviewHidden = matchedReview ? matchedReview.is_hidden : false;

                                    return (
                                        <tr key={report.id}>
                                            <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {report.review_comment || `Review #${report.review}`}
                                            </td>
                                            <td>{report.course_title || "LMS Course"}</td>
                                            <td><strong>{report.reported_by_username || `User #${report.reported_by}`}</strong></td>
                                            <td>
                                                <span className="qa-status-badge incomplete" style={{ background: "#fef9c3", color: "#854d0e", border: "none" }}>
                                                    {report.reason}
                                                </span>
                                            </td>
                                            <td>{dateStr}</td>
                                            <td>
                                                <span className={`qa-status-badge ${report.status === "Reviewed" ? "answered" : (report.status === "Dismissed" ? "incomplete" : "unanswered")}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                    {isReviewHidden ? (
                                                        <button className="btn-approve" style={{ cursor: "pointer", background: "#3b82f6" }} onClick={() => restoreReview(report.review)}>
                                                            Restore
                                                        </button>
                                                    ) : (
                                                        <button className="btn-reject" style={{ cursor: "pointer" }} onClick={() => hideReview(report.review)}>
                                                            Hide
                                                        </button>
                                                    )}
                                                    {report.status === "Pending" && (
                                                        <>
                                                            <button className="btn-approve" style={{ cursor: "pointer" }} onClick={() => markReportReviewed(report.id)}>
                                                                Reviewed
                                                            </button>
                                                            <button className="btn-reject" style={{ cursor: "pointer", background: "#6b7280" }} onClick={() => dismissReport(report.id)}>
                                                                Dismiss
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
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

export default AdminDashboard;