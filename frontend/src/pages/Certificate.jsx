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
    const [quizId, setQuizId] = useState(null);

    useEffect(() => {
        setLoading(true);

        // Fetch current user details
        API.get("accounts/profile/")
            .then(res => setCurrentUser(res.data))
            .catch(console.log);

        // Fetch course details, progress, and quizzes to evaluate eligibility
        Promise.all([
            API.get(`courses/${courseId}/`),
            API.get("progress/"),
            API.get("quizzes/")
        ])
            .then(([courseRes, progressRes, quizRes]) => {
                const courseData = courseRes.data;
                setCourse(courseData);

                const sortedMods = courseData.modules || [];
                const lessonsFlat = sortedMods.flatMap(m => m.lessons || []);
                const allLessonIds = lessonsFlat.map(l => l.id);

                const completedIds = progressRes.data
                    .filter(item => item.completed)
                    .map(item => item.lesson);
                
                const allLessonsCompleted = lessonsFlat.length > 0 && lessonsFlat.every(l => completedIds.includes(l.id));

                const courseQuizzes = quizRes.data.filter(q => allLessonIds.includes(q.lesson));
                const hasQuiz = courseQuizzes.length > 0;
                if (hasQuiz) {
                    setQuizId(courseQuizzes[0].id);
                }

                const quizPassed = localStorage.getItem(`quiz_passed_${courseId}`) === "true";

                if (!allLessonsCompleted) {
                    setErrorMsg("You are not eligible for a certificate yet. Please complete all lessons.");
                    setLoading(false);
                } else if (hasQuiz && !quizPassed) {
                    setErrorMsg("You must pass the course quiz before claiming your certificate.");
                    setLoading(false);
                } else {
                    // Call certificate endpoint directly to load blob
                    return API.get(`courses/${courseId}/certificate/`, { responseType: "blob" })
                        .then((res) => {
                            setCertificateBlob(res.data);
                            setLoading(false);
                        });
                }
            })
            .catch((err) => {
                console.error("Error evaluating certificate eligibility:", err);
                setErrorMsg("Failed to load certificate. Please complete all lessons in this course.");
                setLoading(false);
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
                        {errorMsg.includes("quiz") && quizId ? (
                            <button className="btn-primary-flow" onClick={() => navigate(`/quiz/${quizId}`)}>
                                Take Course Quiz
                            </button>
                        ) : (
                            <button className="btn-primary-flow" onClick={() => navigate(`/courses/${courseId}/modules`)}>
                                Resume Learning
                            </button>
                        )}
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
