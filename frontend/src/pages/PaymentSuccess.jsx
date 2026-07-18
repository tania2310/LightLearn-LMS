import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [verifying, setVerifying] = useState(true);
    const [status, setStatus] = useState("verifying"); // verifying, success, error
    const [paymentData, setPaymentData] = useState(null);

    const paypalOrderId = searchParams.get("paypal_order_id") || searchParams.get("token");

    const captureOrder = (orderId) => {
        API.post("paypal/capture-order/", { order_id: orderId })
            .then(res => {
                setPaymentData(res.data);
                setStatus("success");
                setVerifying(false);
            })
            .catch(err => {
                console.error("PayPal capture failed:", err);
                setStatus("error");
                setVerifying(false);
            });
    };

    useEffect(() => {
        if (paypalOrderId) {
            captureOrder(paypalOrderId);
        } else {
            // Fallback success state
            setStatus("success");
            setVerifying(false);
        }
    }, [paypalOrderId]);

    const downloadReceipt = () => {
        if (!paymentData || !paymentData.payment_id) return;
        API.get(`receipt/${paymentData.payment_id}/`, { responseType: 'blob' })
            .then(response => {
                const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `receipt-${paymentData.payment_id}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
            })
            .catch(err => {
                console.error("Failed to download receipt:", err);
                alert("Failed to download receipt.");
            });
    };

    const handleRetry = () => {
        if (paypalOrderId) {
            setVerifying(true);
            setStatus("verifying");
            captureOrder(paypalOrderId);
        } else {
            navigate("/courses");
        }
    };

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
                            
                            {paymentData && (
                                <div style={{ 
                                    background: "var(--surface-hover)", 
                                    padding: "15px", 
                                    borderRadius: "8px", 
                                    textAlign: "left", 
                                    fontSize: "0.9rem",
                                    border: "1px solid var(--border)",
                                    margin: "10px 0"
                                }}>
                                    <p style={{ margin: "4px 0" }}><strong>Course:</strong> {paymentData.course}</p>
                                    <p style={{ margin: "4px 0" }}><strong>Transaction ID:</strong> {paymentData.transaction_id || "N/A"}</p>
                                    <p style={{ margin: "4px 0" }}><strong>Amount Paid:</strong> ${paymentData.amount}</p>
                                    <p style={{ margin: "4px 0" }}><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                                </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                                <button 
                                    className="course-btn" 
                                    onClick={() => {
                                        if (paymentData && paymentData.course_id) {
                                            navigate(`/courses/${paymentData.course_id}/modules`);
                                        } else {
                                            navigate("/dashboard");
                                        }
                                    }}
                                    style={{ backgroundColor: "#22c55e", color: "white" }}
                                >
                                    Go to Course
                                </button>
                                {paymentData && paymentData.payment_id && (
                                    <button 
                                        className="course-btn" 
                                        onClick={downloadReceipt}
                                        style={{ backgroundColor: "#7c3aed", color: "white" }}
                                    >
                                        Download Receipt
                                    </button>
                                )}
                                <button 
                                    className="course-btn" 
                                    onClick={() => navigate("/payment-history")}
                                    style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-h)", border: "1px solid var(--border)" }}
                                >
                                    Payment History
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: "4rem", color: "#ef4444" }}>❌</div>
                            <h2 style={{ color: "#ef4444", margin: 0 }}>Verification Failed</h2>
                            <p>We were unable to verify your payment status. Please try capturing again or contact support.</p>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
                                <button 
                                    className="course-btn" 
                                    onClick={handleRetry}
                                    style={{ backgroundColor: "#7c3aed", color: "white" }}
                                >
                                    Retry Payment Capture
                                </button>
                                <button 
                                    className="course-btn" 
                                    onClick={() => navigate("/dashboard")}
                                    style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-h)", border: "1px solid var(--border)" }}
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export default PaymentSuccess;
