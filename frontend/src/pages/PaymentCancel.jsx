import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function PaymentCancel() {
    const navigate = useNavigate();

    return (
        <>
            <Navbar />
            <div className="chat-container" style={{ maxWidth: "500px", margin: "50px auto", padding: "20px" }}>
                <div className="chat-room" style={{ padding: "30px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ fontSize: "4rem", color: "#eab308" }}>⚠️</div>
                    <h2 style={{ color: "#eab308", margin: 0 }}>Payment Cancelled</h2>
                    <p>The checkout process was cancelled. You have not been charged.</p>
                    <button 
                        className="course-btn" 
                        onClick={() => navigate("/dashboard")}
                        style={{ backgroundColor: "#7c3aed", color: "white", marginTop: "10px" }}
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </>
    );
}

export default PaymentCancel;
