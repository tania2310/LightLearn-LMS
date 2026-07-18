import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function Checkout() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrollment, setEnrollment] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        // Fetch course details
        API.get(`courses/${courseId}/`)
            .then(res => {
                setCourse(res.data);
                // Check if user already has an enrollment for this course
                API.get("enrollments/")
                    .then(enrollRes => {
                        const found = enrollRes.data.find(e => e.course === Number(courseId));
                        if (found) {
                            if (found.status === "approved") {
                                navigate(`/courses/${courseId}/modules`);
                                return;
                            }
                            setEnrollment(found);
                            setLoading(false);
                        } else {
                            // Create pending enrollment first
                            API.post("enrollments/", { course: Number(courseId) })
                                .then(createRes => {
                                    setEnrollment(createRes.data);
                                    setLoading(false);
                                })
                                .catch(err => {
                                    console.error("Failed to create enrollment:", err);
                                    alert("Unable to initiate checkout enrollment.");
                                    setLoading(false);
                                });
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        setLoading(false);
                    });
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [courseId]);


    const handlePayPalPayment = () => {
        if (!enrollment) return;
        setProcessing(true);
        API.post("paypal/create-order/", {
            enrollment_id: enrollment.id
        })
            .then(res => {
                if (res.data.approval_url) {
                    window.location.href = res.data.approval_url;
                } else {
                    alert("PayPal approval url not returned.");
                    setProcessing(false);
                }
            })
            .catch(err => {
                console.error(err);
                alert("Failed to initiate PayPal Order.");
                setProcessing(false);
            });
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ textAlign: "center", padding: "50px" }}>
                    <p>Loading course checkout details...</p>
                </div>
            </>
        );
    }

    if (!course) {
        return (
            <>
                <Navbar />
                <div style={{ textAlign: "center", padding: "50px" }}>
                    <p>Course not found.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="chat-container" style={{ maxWidth: "600px", margin: "40px auto", padding: "20px" }}>
                <div className="chat-room" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <h2 style={{ borderBottom: "1px solid var(--border)", paddingBottom: "10px", margin: 0 }}>Checkout Course</h2>
                    <div>
                        <h3 style={{ margin: "5px 0" }}>{course.title}</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>{course.category} • {course.level}</p>
                    </div>
                    <div style={{ background: "rgba(124, 58, 237, 0.05)", padding: "15px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "600" }}>Total Amount</span>
                        <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#7c3aed" }}>${course.price}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <p style={{ margin: 0, fontWeight: "600", fontSize: "0.95rem" }}>Choose Payment Method:</p>
                        <button
                            className="course-btn"
                            disabled={processing}
                            onClick={handlePayPalPayment}
                            style={{ backgroundColor: "#ffc439", color: "#111", padding: "12px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                        >
                            {processing ? "Redirecting..." : "Continue with PayPal"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Checkout;
