import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/MyProgress.css";

function StudentProgress() {
    const [enrollments, setEnrollments] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [loadingCourseId, setLoadingCourseId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            API.get("enrollments/"),
            API.get("certificates/").catch(() => ({ data: [] }))
        ])
            .then(([enrollRes, certRes]) => {
                const approved = enrollRes.data.filter(e => e.status === "approved");
                setEnrollments(approved);
                setCertificates(certRes.data);
            })
            .catch(console.log);
    }, []);

    const handleContinueLearning = (courseId) => {
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
            })
            .finally(() => {
                setLoadingCourseId(null);
            });
    };

    return (
        <>
            <Navbar />

            <div className="progress-container">
                <h1 style={{ color: "var(--text-primary)" }}>My Progress</h1>

                {enrollments.length === 0 ? (
                    <p className="empty-placeholder-msg">You are not enrolled in any approved courses yet.</p>
                ) : (
                    <div className="progress-grid">
                        {enrollments.map((enrollment) => {
                            const isCompleted = enrollment.progress && enrollment.progress.percent === 100;
                            const hasCertificate = certificates.some(c => c.course === enrollment.course);

                            return (
                                <div className="progress-course-card" key={enrollment.id}>
                                    <div className="progress-header">
                                        <div className="progress-thumbnail-placeholder">
                                            📖
                                        </div>
                                        <div>
                                            <h2>{enrollment.course_title}</h2>
                                        </div>
                                    </div>

                                    {enrollment.progress && (
                                        <>
                                            {/* Progress Bar & Percentage */}
                                            <div className="progress-bar-container">
                                                <div 
                                                    className="progress-bar-fill"
                                                    style={{ width: `${enrollment.progress.percent}%` }}
                                                />
                                            </div>
                                            <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "16px" }}>
                                                {enrollment.progress.percent}% Completed
                                            </div>

                                            {/* Current Module */}
                                            <div className="progress-section">
                                                <div className="progress-section-title">Current Module</div>
                                                <div className="progress-section-content">
                                                    Module {enrollment.progress.current_module_number} of {enrollment.progress.total_modules} • {enrollment.progress.current_module_title}
                                                </div>
                                            </div>

                                            {/* Current Lesson */}
                                            <div className="progress-section">
                                                <div className="progress-section-title">Current Lesson</div>
                                                <div className="progress-section-content">
                                                    Lesson {enrollment.progress.current_lesson_number} of {enrollment.progress.total_module_lessons} • {enrollment.progress.current_lesson_title}
                                                </div>
                                            </div>

                                            {/* Lesson Count Summary */}
                                            <div className="progress-stat">
                                                <strong>{enrollment.progress.completed_count} / {enrollment.progress.total_count}</strong> Lessons Completed
                                            </div>
                                        </>
                                    )}

                                    <div className="progress-actions">
                                        {isCompleted ? (
                                            <>
                                                <span className="course-completed-badge">
                                                    ✓ Course Completed
                                                </span>
                                                {hasCertificate && (
                                                    <button 
                                                        className="primary-btn"
                                                        onClick={() => navigate(`/courses/${enrollment.course}/certificate`)}
                                                    >
                                                        View Certificate
                                                    </button>
                                                )}
                                            </>
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
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

export default StudentProgress;