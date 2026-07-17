import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/learningFlow.css";
import "../styles/learningFlowExtras.css";

function Certificate() {
    const { id: courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [certificateBlob, setCertificateBlob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        // Fetch course details
        API.get(`courses/${courseId}/`)
            .then(res => setCourse(res.data))
            .catch(console.log);

        // Fetch current user details
        API.get("accounts/profile/")
            .then(res => setCurrentUser(res.data))
            .catch(console.log);

        // Call certificate endpoint directly to verify eligibility and load blob
        API.get(`courses/${courseId}/certificate/`, { responseType: "blob" })
            .then((res) => {
                setCertificateBlob(res.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching certificate:", err);
                if (err.response && err.response.data) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            const errorObj = JSON.parse(reader.result);
                            setErrorMsg(errorObj.error || "Failed to load certificate.");
                        } catch (e) {
                            setErrorMsg("You are not eligible for a certificate yet. Please complete all lessons.");
                        }
                        setLoading(false);
                    };
                    reader.readAsText(err.response.data);
                } else {
                    setErrorMsg("Failed to load certificate. Please complete all lessons in this course.");
                    setLoading(false);
                }
            });
    }, [courseId]);

    const handleDownload = () => {
        if (!certificateBlob) return;
        const url = window.URL.createObjectURL(new Blob([certificateBlob]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${course ? course.title : "course"}_certificate.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ padding: "40px", textAlign: "center" }}>
                    <h3>Checking certificate eligibility...</h3>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="certificate-view-container">
                <div style={{ marginBottom: "30px" }}>
                    <button className="btn-secondary" onClick={() => navigate(`/courses/${courseId}/modules`)}>
                        ← Back to Learning
                    </button>
                </div>

                {errorMsg ? (
                    <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "12px", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🔒</div>
                        <h2>Certificate Locked</h2>
                        <p style={{ color: "var(--text)", margin: "10px 0 20px 0" }}>{errorMsg}</p>
                        <button className="btn-primary-flow" onClick={() => navigate(`/courses/${courseId}/modules`)}>
                            Resume Learning
                        </button>
                    </div>
                ) : (
                    <div>
                        {/* Certificate Preview Box */}
                        <div className="certificate-preview-box">
                            <h2>Certificate of Completion</h2>
                            <p style={{ fontStyle: "italic", margin: "20px 0" }}>This is proudly presented to</p>
                            <div className="name">{currentUser ? `${currentUser.first_name || ""} ${currentUser.last_name || currentUser.username}` : "Student Name"}</div>
                            <p className="text">
                                for successfully completing the curriculum of study for the course
                                <br />
                                <span className="course-title">"{course ? course.title : "Course Title"}"</span>
                            </p>
                            <div className="certificate-footer-meta">
                                <span>Issued Date: {new Date().toLocaleDateString()}</span>
                                <span>Platform: LearnHub LMS</span>
                            </div>
                        </div>

                        <div style={{ textAlign: "center" }}>
                            <button className="btn-download" onClick={handleDownload}>
                                📥 Download Official PDF Certificate
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default Certificate;
