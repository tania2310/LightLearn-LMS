import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";

function PaymentHistory() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get("payments/history/")
            .then(res => {
                setPayments(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load payment history:", err);
                setLoading(false);
            });
    }, []);

    return (
        <>
            <Navbar />
            <div className="chat-container" style={{ maxWidth: "1000px", margin: "40px auto", padding: "20px" }}>
                <div className="chat-room" style={{ padding: "25px" }}>
                    <h2 style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Payment History</h2>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "30px" }}>
                            <div className="spinner-loader" style={{ width: "30px", height: "30px" }} />
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="empty-placeholder-msg">
                            No payment transactions found.
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid var(--border)", fontWeight: "600" }}>
                                        <th style={{ padding: "12px 10px" }}>Course</th>
                                        <th style={{ padding: "12px 10px" }}>Provider</th>
                                        <th style={{ padding: "12px 10px" }}>Amount</th>
                                        <th style={{ padding: "12px 10px" }}>Status</th>
                                        <th style={{ padding: "12px 10px" }}>Transaction ID</th>
                                        <th style={{ padding: "12px 10px" }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(payment => {
                                        const dateStr = payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "N/A";
                                        const statusColors = {
                                            "Paid": { bg: "#dcfce7", color: "#166534" },
                                            "Pending": { bg: "#fef9c3", color: "#854d0e" },
                                            "Failed": { bg: "#fee2e2", color: "#991b1b" },
                                            "Refunded": { bg: "#f3f4f6", color: "#374151" },
                                            "Disputed": { bg: "#fee2e2", color: "#991b1b" }
                                        };
                                        const badgeStyle = statusColors[payment.status] || { bg: "#f3f4f6", color: "#374151" };

                                        return (
                                            <tr key={payment.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                                <td style={{ padding: "12px 10px", fontWeight: "600" }}>
                                                    {payment.course_title || "LMS Course"}
                                                    {payment.status === "Disputed" && (
                                                        <div style={{ color: "#ef4444", fontSize: "0.8rem", fontWeight: "normal", marginTop: "4px" }}>
                                                            ⚠️ Course access revoked due to payment dispute.
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 10px" }}>{payment.provider}</td>
                                                <td style={{ padding: "12px 10px", fontWeight: "600", color: "#7c3aed" }}>${payment.amount}</td>
                                                <td style={{ padding: "12px 10px" }}>
                                                    <span style={{ 
                                                        backgroundColor: badgeStyle.bg, 
                                                        color: badgeStyle.color, 
                                                        padding: "4px 8px", 
                                                        borderRadius: "4px", 
                                                        fontSize: "0.85rem", 
                                                        fontWeight: "600" 
                                                    }}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 10px", fontFamily: "monospace", fontSize: "0.85rem" }}>
                                                    {payment.transaction_id || payment.payment_intent_id || "N/A"}
                                                </td>
                                                <td style={{ padding: "12px 10px" }}>{dateStr}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default PaymentHistory;
