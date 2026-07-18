import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function PaymentCancel() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const courseId = searchParams.get("course_id");

    const handleRetry = () => {
        if (courseId) {
            navigate(`/checkout/${courseId}`);
        } else {
            navigate("/courses");
        }
    };

    const handleReturn = () => {
        if (courseId) {
            navigate(`/courses/${courseId}`);
        } else {
            navigate("/courses");
        }
    };

    return (
        <>
            <Navbar />
            <div className="chat-container" style={{ maxWidth: "500px", margin: "50px auto", padding: "20px" }}>
                <div className="chat-room" style={{ padding: "30px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ fontSize: "4rem", color: "#eab308" }}>⚠️</div>
                    <h2 style={{ color: "#eab308", margin: 0 }}>Payment Cancelled</h2>
                    <p>The checkout process was cancelled. You have not been charged.</p>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                        <button 
                            className="course-btn" 
                            onClick={handleRetry}
                            style={{ backgroundColor: "#ffc439", color: "#111" }}
                        >
                            Retry Payment
                        </button>
                        <button 
                            className="course-btn" 
                            onClick={handleReturn}
                            style={{ backgroundColor: "#7c3aed", color: "white" }}
                        >
                            Return to Course
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default PaymentCancel;
