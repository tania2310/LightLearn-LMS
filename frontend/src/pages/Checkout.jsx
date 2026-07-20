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
        // Fetch course details, enrollment, and payment status
        Promise.all([
            API.get(`courses/${courseId}/`),
            API.get("enrollments/").catch(() => ({ data: [] })),
            API.get("payments/history/").catch(() => ({ data: [] }))
        ])
            .then(([courseRes, enrollRes, payRes]) => {
                setCourse(courseRes.data);
                const found = enrollRes.data.find(e => e.course === Number(courseId));
                
                if (!found || found.status !== "approved") {
                    alert("Enrollment approval by admin is required before making a payment.");
                    navigate(`/courses/${courseId}`);
                    return;
                }

                const paidPayment = payRes.data.find(p => (p.enrollment === found.id || p.enrollment_id === found.id) && p.status === "Paid");
                if (paidPayment || Number(courseRes.data.price) <= 0) {
                    navigate(`/courses/${courseId}/modules`);
                    return;
                }

                setEnrollment(found);
                setLoading(false);
            })
            .catch(err => {
                console.error("Checkout initialization error:", err);
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
