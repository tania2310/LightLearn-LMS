import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [verifying, setVerifying] = useState(true);
    const [status, setStatus] = useState("verifying"); // verifying, success, error

    const sessionId = searchParams.get("session_id");
    const paypalOrderId = searchParams.get("paypal_order_id") || searchParams.get("token");

    useEffect(() => {
        if (sessionId) {
            // Verify Stripe Session
            API.post("payments/stripe/check-session/", { session_id: sessionId })
                .then(() => {
                    setStatus("success");
                    setVerifying(false);
                })
                .catch(err => {
                    console.error("Stripe verify failed:", err);
                    setStatus("error");
                    setVerifying(false);
                });
        } else if (paypalOrderId) {
            // Capture PayPal Order
            API.post("payments/paypal/capture-order/", { order_id: paypalOrderId })
                .then(() => {
                    setStatus("success");
                    setVerifying(false);
                })
                .catch(err => {
                    console.error("PayPal capture failed:", err);
                    setStatus("error");
                    setVerifying(false);
                });
        } else {
            // No payment credentials found (could be direct success redirect)
            setStatus("success");
            setVerifying(false);
        }
    }, [sessionId, paypalOrderId]);

    return (
        <>
            <Navbar />
            <div className="chat-container" style={{ maxWidth: "500px", margin: "50px auto", padding: "20px" }}>
                <div className="chat-room" style={{ padding: "30px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
                    {verifying ? (
                        <>
                            <div className="spinner-loader" style={{ margin: "20px auto", width: "40px", height: "40px" }} />
                            <h2>Verifying Payment...</h2>
                            <p>Please do not refresh or close this page.</p>
                        </>
                    ) : status === "success" ? (
                        <>
                            <div style={{ fontSize: "4rem", color: "#22c55e" }}>✅</div>
                            <h2 style={{ color: "#22c55e", margin: 0 }}>Payment Successful!</h2>
                            <p>Your payment has been processed and course access is activated.</p>
                            <button 
                                className="course-btn" 
                                onClick={() => navigate("/dashboard")}
                                style={{ backgroundColor: "#7c3aed", color: "white", marginTop: "10px" }}
                            >
                                Go to Student Dashboard
                            </button>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: "4rem", color: "#ef4444" }}>❌</div>
                            <h2 style={{ color: "#ef4444", margin: 0 }}>Verification Failed</h2>
                            <p>We were unable to verify your payment status. Please contact support or check payment history.</p>
                            <button 
                                className="course-btn" 
                                onClick={() => navigate("/dashboard")}
                                style={{ backgroundColor: "#7c3aed", color: "white", marginTop: "10px" }}
                            >
                                Go to Dashboard
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export default PaymentSuccess;
