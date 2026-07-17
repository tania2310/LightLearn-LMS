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

                const approved = enrollmentRes.data.filter(
                    (e) => e.status === "approved"
                );

                setEnrollments(approved);
                
                const completedProgress = progressRes.data.filter(p => p.completed);
                setProgressCount(completedProgress.length);
                
                setCertificatesCount(certRes.data.length);
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

                            <p>Email: {user.email}</p>

                            <p>Role: {user.role}</p>

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
                                <p>{enrollments.length}</p>
                            </div>

                             <div className="stat-card">
                                 <h2>✅</h2>
                                 <h3>Progress</h3>
                                 <p>{progressCount} Completed Lessons</p>
                             </div>

                             <div className="stat-card">
                                 <h2>🏆</h2>
                                 <h3>Certificates</h3>
                                 <p>{certificatesCount} Earned</p>
                             </div>

                             <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => navigate("/refund-requests")}>
                                <h2>💸</h2>
                                <h3>Refund Requests</h3>
                                <p>View & Manage</p>
                             </div>

                             <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => navigate("/payment-history")}>
                                <h2>💳</h2>
                                <h3>Payment History</h3>
                                <p>View Transactions</p>
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

                                        <button 
                                            className="primary-btn"
                                            onClick={() => handleContinueLearning(enrollment.course)}
                                            disabled={loadingCourseId === enrollment.course}
                                        >
                                            {loadingCourseId === enrollment.course ? "Loading..." : "Continue Learning"}
                                        </button>
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