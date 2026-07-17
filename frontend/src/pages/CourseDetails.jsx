import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/CourseDetails.css";

function CourseDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [enrolled, setEnrolled] = useState(false);
    const [enrollment, setEnrollment] = useState(null);
    const [refundRequest, setRefundRequest] = useState(null);
    const [reason, setReason] = useState("");

    useEffect(() => {
        Promise.all([
            API.get(`courses/${id}/`),
            API.get("enrollments/"),
            API.get("refunds/").catch(() => ({ data: [] }))
        ])
            .then(([courseRes, enrollmentRes, refundsRes]) => {
                setCourse(courseRes.data);

                const foundEnrollment = enrollmentRes.data.find(
                    (e) => e.course === Number(id)
                );
                setEnrollment(foundEnrollment);

                if (foundEnrollment) {
                    const foundRefund = refundsRes.data.find(
                        (r) => r.enrollment === foundEnrollment.id
                    );
                    setRefundRequest(foundRefund);

                    const hasApprovedRefund = foundRefund && foundRefund.status === "Approved";

                    if (foundEnrollment.status === "approved" && !hasApprovedRefund) {
                        setEnrolled(true);
                    } else if (foundEnrollment.status === "pending") {
                        alert("Your enrollment is awaiting admin approval.");
                    } else if (foundEnrollment.status === "rejected") {
                        alert("Your enrollment was rejected.");
                    }
                }
            })
            .catch((error) => {
                console.log(error);
            });
    }, [id]);

    if (!course) {
        return <p>Loading...</p>;
    }
    const handleEnroll = () => {
        const token = localStorage.getItem("access");

        API
            .post(
                "http://127.0.0.1:8000/api/enrollments/",
                {
                    course: course.id,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )
            .then(() => {
                alert("Enrollment request sent. Please wait for admin approval.");
            })
            .catch((error) => {
                console.log(error);

                if (error.response) {
                    alert(JSON.stringify(error.response.data));
                } else {
                    alert("Enrollment failed.");
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
                setEnrolled(false);
            })
            .catch((err) => {
                console.error("Refund error:", err);
                alert("Failed to submit refund request.");
            });
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

                {enrolled ? (
                    <button className="course-btn"
                        onClick={() => navigate(`/courses/${course.id}/modules`)}
                    >
                        Start Learning
                    </button>
                ) : (
                    Number(course.price) > 0 ? (
                        <button className="course-btn" onClick={() => navigate(`/checkout/${course.id}`)} style={{ backgroundColor: "#22c55e", color: "white" }}>
                            Buy Course - ${course.price}
                        </button>
                    ) : (
                        <button className="course-btn" onClick={handleEnroll}>
                            Request Enrollment
                        </button>
                    )
                )}

                {enrollment && enrollment.status === "approved" && (
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
