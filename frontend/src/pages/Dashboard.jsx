import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import { Link, useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [progressCount, setProgressCount] = useState(0);
    const [certificatesCount, setCertificatesCount] = useState(0);
    const [completedCourseIds, setCompletedCourseIds] = useState([]);
    const [loadingCourseId, setLoadingCourseId] = useState(null);

    const handleContinueLearning = (courseId) => {
        if (loadingCourseId) return;
        setLoadingCourseId(courseId);
        Promise.all([
            API.get(`courses/${courseId}/`),
            API.get("progress/"),
        ])
            .then(([courseRes, progressRes]) => {
                const course = courseRes.data;
                const progressList = progressRes.data;
                const completedLessonIds = progressList
                    .filter((p) => p.completed)
                    .map((p) => p.lesson);

                // Reconstruct sorted module & lesson structure
                const sortedModules = (course.modules || [])
                    .sort((a, b) => a.order - b.order)
                    .map((m) => ({
                        ...m,
                        lessons: (m.lessons || []).sort((a, b) => a.order - b.order),
                    }));

                const allLessons = sortedModules.flatMap((m) => m.lessons || []);

                if (allLessons.length === 0) {
                    alert("This course does not have any lessons yet.");
                    return;
                }

                // Find first incomplete lesson
                const firstIncomplete = allLessons.find(
                    (l) => !completedLessonIds.includes(l.id)
                );

                if (firstIncomplete) {
                    navigate(`/lessons/${firstIncomplete.id}`);
                } else {
                    // All lessons completed: open the last lesson
                    const lastLesson = allLessons[allLessons.length - 1];
                    navigate(`/lessons/${lastLesson.id}`);
                }
            })
            .catch((err) => {
                console.error("Error navigating to next incomplete lesson:", err);
                // Fallback to modules page
                navigate(`/courses/${courseId}/modules`);
            })
            .finally(() => {
                setLoadingCourseId(null);
            });
    };

    useEffect(() => {
        Promise.all([
            API.get("accounts/profile/"),
            API.get("enrollments/"),
            API.get("progress/").catch(() => ({ data: [] })),
            API.get("certificates/").catch(() => ({ data: [] }))
        ])
            .then(([profileRes, enrollmentRes, progressRes, certRes]) => {
                setUser(profileRes.data);

                setEnrollments(enrollmentRes.data);
                
                const completedProgress = progressRes.data.filter(p => p.completed);
                setProgressCount(completedProgress.length);
                
                setCertificatesCount(certRes.data.length);
                setCompletedCourseIds(certRes.data.map(c => c.course));
            })
            .catch((error) => {
                console.log(error);
            });
    }, []);

    return (
        <>
            <Navbar />

            <div className="dashboard-container">

                {user && (
                    <>
                        <div className="welcome-card">
                            <h1>Welcome, {user.username} 👋</h1>

                            <Link to="/courses">
                                <button className="primary-btn">
                                    Browse Courses
                                </button>
                            </Link>
                        </div>

                        <div className="stats-grid">

                            <div className="stat-card">
                                <h2>📚</h2>
                                <h3>Enrolled Courses</h3>
                                <p className="stat-value">{enrollments.length}</p>
                                <div className="stat-spacer"></div>
                                <button className="primary-btn stat-btn" onClick={() => navigate("/courses")}>
                                    View Courses
                                </button>
                            </div>

                            <div className="stat-card">
                                <h2>🏆</h2>
                                <h3>Certificates</h3>
                                <p className="stat-value">{certificatesCount} Earned</p>
                                <div className="stat-spacer"></div>
                                <button className="primary-btn stat-btn" onClick={() => navigate("/progress")}>
                                    View Certificates
                                </button>
                            </div>

                            <div className="stat-card">
                                <h2>💸</h2>
                                <h3>Refund Requests</h3>
                                <p className="stat-value">Refunds</p>
                                <div className="stat-spacer"></div>
                                <button className="primary-btn stat-btn" onClick={() => navigate("/refund-requests")}>
                                    View & Manage
                                </button>
                            </div>

                            <div className="stat-card">
                                <h2>💳</h2>
                                <h3>Payment History</h3>
                                <p className="stat-value">Transactions</p>
                                <div className="stat-spacer"></div>
                                <button className="primary-btn stat-btn" onClick={() => navigate("/payment-history")}>
                                    View Transactions
                                </button>
                            </div>

                        </div>

                        <div className="enrolled-section">

                            <h2>My Courses</h2>

                            {enrollments.length === 0 ? (
                                <p>No approved courses yet.</p>
                            ) : (
                                enrollments.map((enrollment) => (
                                    <div
                                        className="course-card"
                                        key={enrollment.id}
                                    >
                                        <h3>{enrollment.course_title}</h3>

                                        <p>
                                            Status:
                                            <strong> {enrollment.status}</strong>
                                        </p>

                                        {enrollment.status === "approved" && enrollment.progress && (
                                            <div className="course-progress-details" style={{ width: "100%", margin: "15px 0" }}>
                                                {/* Progress Bar & Percentage */}
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                                                    <div style={{ flex: 1, height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                                                        <div style={{ width: `${enrollment.progress.percent}%`, height: "100%", background: "var(--accent)", borderRadius: "4px" }}></div>
                                                    </div>
                                                    <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.95rem" }}>
                                                        {enrollment.progress.percent}%
                                                    </span>
                                                </div>

                                                {/* Current Module */}
                                                <div style={{ marginBottom: "10px" }}>
                                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                                                        Current Module
                                                    </div>
                                                    <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", marginTop: "2px" }}>
                                                        {enrollment.progress.current_module_number} of {enrollment.progress.total_modules} • {enrollment.progress.current_module_title}
                                                    </div>
                                                </div>

                                                {/* Current Lesson */}
                                                <div style={{ marginBottom: "12px" }}>
                                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                                                        Current Lesson
                                                    </div>
                                                    <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", marginTop: "2px" }}>
                                                        {enrollment.progress.current_lesson_number} of {enrollment.progress.total_module_lessons} • {enrollment.progress.current_lesson_title}
                                                    </div>
                                                </div>

                                                {/* Completed Summary */}
                                                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                                    <strong>{enrollment.progress.completed_count} / {enrollment.progress.total_count}</strong> Lessons Completed
                                                </div>
                                            </div>
                                        )}

                                        {enrollment.status === "pending" ? (
                                            <button 
                                                className="primary-btn pending-btn"
                                                disabled
                                            >
                                                Enrollment Pending Approval
                                            </button>
                                        ) : enrollment.status === "rejected" ? (
                                            <button 
                                                className="primary-btn rejected-btn"
                                                disabled
                                            >
                                                Enrollment Rejected
                                            </button>
                                        ) : completedCourseIds.includes(enrollment.course) ? (
                                            <button 
                                                className="primary-btn completed-btn"
                                                disabled
                                            >
                                                Completed
                                            </button>
                                        ) : (
                                            <button 
                                                className="primary-btn"
                                                onClick={() => handleContinueLearning(enrollment.course)}
                                                disabled={loadingCourseId === enrollment.course}
                                            >
                                                {loadingCourseId === enrollment.course ? "Loading..." : "Continue Learning"}
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}

                        </div>

                    </>
                )}

            </div>
        </>
    );
}

export default Dashboard;