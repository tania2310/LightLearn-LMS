import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/CourseDetails.css";

function CourseDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [enrollment, setEnrollment] = useState(null);
    const [isPaid, setIsPaid] = useState(false);
    const [refundRequest, setRefundRequest] = useState(null);
    const [reason, setReason] = useState("");
    const [loadingData, setLoadingData] = useState(true);

    const fetchData = () => {
        setLoadingData(true);
        Promise.all([
            API.get(`courses/${id}/`),
            API.get("enrollments/").catch(() => ({ data: [] })),
            API.get("payments/history/").catch(() => ({ data: [] })),
            API.get("refunds/").catch(() => ({ data: [] }))
        ])
            .then(([courseRes, enrollmentRes, paymentsRes, refundsRes]) => {
                setCourse(courseRes.data);

                const foundEnrollment = enrollmentRes.data.find(
                    (e) => e.course === Number(id)
                );
                setEnrollment(foundEnrollment);

                if (foundEnrollment) {
                    // Check if paid payment exists for this enrollment
                    const paidPayment = paymentsRes.data.find(
                        (p) => (p.enrollment === foundEnrollment.id || p.enrollment_id === foundEnrollment.id) && p.status === "Paid"
                    );
                    setIsPaid(!!paidPayment);

                    const foundRefund = refundsRes.data.find(
                        (r) => r.enrollment === foundEnrollment.id
                    );
                    setRefundRequest(foundRefund);
                }
                setLoadingData(false);
            })
            .catch((error) => {
                console.error("Error fetching course details:", error);
                setLoadingData(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    if (!course || loadingData) {
        return (
            <>
                <Navbar />
                <div style={{ textAlign: "center", padding: "50px" }}>
                    <p>Loading course details...</p>
                </div>
            </>
        );
    }

    const handleEnroll = () => {
        API.post("enrollments/", { course: course.id })
            .then(() => {
                alert("Enrollment request sent. Please wait for admin approval.");
                fetchData();
            })
            .catch((error) => {
                console.error("Enrollment error:", error);
                if (error.response && error.response.data) {
                    alert(typeof error.response.data === "object" ? JSON.stringify(error.response.data) : error.response.data);
                } else {
                    alert("Enrollment request failed.");
                }
            });
    };

    const handleRequestRefund = () => {
        if (!reason.trim()) {
            alert("Please state a reason for your refund request.");
            return;
        }
        if (!enrollment) return;

        API.post("refunds/", {
            enrollment: enrollment.id,
            reason: reason
        })
            .then((res) => {
                alert("Refund request submitted successfully.");
                setRefundRequest(res.data);
                setIsPaid(false);
            })
            .catch((err) => {
                console.error("Refund error:", err);
                alert("Failed to submit refund request.");
            });
    };

    // Determine the Single Primary Action Button according to the strict Visibility Matrix
    const renderPrimaryActionButton = () => {
        // State 1: No Enrollment
        if (!enrollment) {
            return (
                <button className="course-btn" onClick={handleEnroll} style={{ backgroundColor: "#3b82f6", color: "white", cursor: "pointer" }}>
                    Enroll
                </button>
            );
        }

        // State 2: Enrollment Pending
        if (enrollment.status === "pending") {
            return (
                <button className="course-btn" disabled style={{ backgroundColor: "#9ca3af", color: "white", cursor: "not-allowed" }}>
                    Waiting for Admin Approval
                </button>
            );
        }

        // State 3: Enrollment Rejected
        if (enrollment.status === "rejected") {
            return (
                <button className="course-btn" disabled style={{ backgroundColor: "#ef4444", color: "white", cursor: "not-allowed" }}>
                    Enrollment Rejected
                </button>
            );
        }

        // State 4 & 5: Enrollment Approved
        if (enrollment.status === "approved") {
            const hasApprovedRefund = refundRequest && refundRequest.status === "Approved";
            if (hasApprovedRefund) {
                return (
                    <button className="course-btn" disabled style={{ backgroundColor: "#ef4444", color: "white", cursor: "not-allowed" }}>
                        Refunded Access Revoked
                    </button>
                );
            }

            const isFree = Number(course.price) <= 0;
            // State 4: Approved & Unpaid (for paid courses)
            if (!isFree && !isPaid) {
                return (
                    <button 
                        className="course-btn" 
                        onClick={() => navigate(`/checkout/${course.id}`)} 
                        style={{ backgroundColor: "#22c55e", color: "white", cursor: "pointer" }}
                    >
                        Make Payment
                    </button>
                );
            }

            // State 5: Approved & Paid (or free course)
            return (
                <button 
                    className="course-btn" 
                    onClick={() => navigate(`/courses/${course.id}/modules`)}
                    style={{ backgroundColor: "#3b82f6", color: "white", cursor: "pointer" }}
                >
                    Continue Learning
                </button>
            );
        }

        return null;
    };

    return (
        <>
            <Navbar />
            <img
                src={
                    course.thumbnail
                        ? course.thumbnail
                        : "https://via.placeholder.com/900x350"
                }
                alt={course.title}
                className="course-banner"
            />

            <div style={{ padding: "40px" }}>
                <h1>{course.title}</h1>

                <h3>Description</h3>
                <p>{course.description}</p>

                <div className="course-info">
                    <p><strong>Category:</strong> {course.category}</p>
                    <p><strong>Level:</strong> {course.level}</p>
                    <p><strong>Language:</strong> {course.language}</p>
                    <p><strong>Duration:</strong> {course.duration} Hours</p>
                    <p><strong>Price:</strong> ${course.price}</p>
                    <p><strong>Mentor:</strong> {course.mentor}</p>
                    <p><strong>Rating:</strong> ⭐ {course.average_rating} (Weighted)</p>
                </div>
                <h2>Course Modules</h2>

                {course.modules.length === 0 ? (
                    <p>No modules added yet.</p>
                ) : (
                    course.modules.map((module) => (
                        <div key={module.id} className="module-card">
                            <h3>{module.title}</h3>
                            <ul>
                                {module.lessons.map((lesson) => (
                                    <li key={lesson.id}>
                                        {lesson.title}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))
                )}

                <h2>Course Reviews</h2>
                <p><strong>Rating:</strong> ⭐ {course.average_rating || "N/A"} (Weighted)</p>
                <div style={{ marginBottom: "30px" }}>
                    <button 
                        className="course-btn" 
                        style={{ background: "#7c3aed", color: "white", cursor: "pointer" }} 
                        onClick={() => navigate(`/courses/${course.id}/reviews`)}
                    >
                        View & Write Reviews
                    </button>
                </div>

                {/* Exactly One Primary Action Button according to Visibility Matrix */}
                <div style={{ marginBottom: "30px" }}>
                    {renderPrimaryActionButton()}
                </div>

                {/* Refund Section for Enrolled & Paid Users */}
                {enrollment && enrollment.status === "approved" && isPaid && (
                    <div style={{ marginTop: "30px", padding: "20px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--code-bg)", textAlign: "left" }}>
                        <h3 style={{ marginTop: 0 }}>Course Refund</h3>
                        {!refundRequest ? (
                            <div>
                                <textarea
                                    style={{ width: "100%", height: "80px", marginBottom: "10px", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)" }}
                                    placeholder="Please state the reason for your refund request..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                                <button 
                                    className="course-btn" 
                                    style={{ background: "#ef4444", color: "white", marginTop: 0, cursor: "pointer" }}
                                    onClick={handleRequestRefund}
                                >
                                    Request Refund
                                </button>
                            </div>
                        ) : (
                            <p>
                                Refund Request Status: 
                                <strong style={{ color: refundRequest.status === "Approved" ? "#16a34a" : (refundRequest.status === "Rejected" ? "#dc2626" : "#b45309") }}>
                                    {" "}{refundRequest.status}
                                </strong>
                            </p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

export default CourseDetails;
