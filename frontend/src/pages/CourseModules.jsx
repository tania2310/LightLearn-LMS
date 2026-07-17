import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/learningFlow.css";

function CourseModules() {
    const { id } = useParams(); // Course ID
    const navigate = useNavigate();
    
    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [completedLessonIds, setCompletedLessonIds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            API.get(`courses/${id}/`),
            API.get("progress/")
        ])
            .then(([courseResponse, progressResponse]) => {
                const courseData = courseResponse.data;
                setCourse(courseData);
                
                // Sort modules by order
                const sortedMods = (courseData.modules || [])
                    .sort((a, b) => a.order - b.order)
                    .map(m => ({
                        ...m,
                        lessons: (m.lessons || []).sort((a, b) => a.order - b.order)
                    }));
                setModules(sortedMods);

                // Extract completed lesson IDs
                const completedIds = progressResponse.data
                    .filter(item => item.completed)
                    .map(item => item.lesson);
                setCompletedLessonIds(completedIds);
            })
            .catch((error) => {
                console.error("Error loading course modules / progress:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    // Flat list of all lessons in course-wide order
    const getAllLessonsInOrder = () => {
        return modules.flatMap(m => m.lessons || []);
    };

    const handleContinueLearning = () => {
        const allLessons = getAllLessonsInOrder();
        if (allLessons.length === 0) {
            alert("No lessons available in this course.");
            return;
        }

        const firstIncomplete = allLessons.find(l => !completedLessonIds.includes(l.id));
        if (firstIncomplete) {
            navigate(`/lessons/${firstIncomplete.id}`);
        } else {
            // All lessons completed - navigate to the last lesson
            const lastLesson = allLessons[allLessons.length - 1];
            navigate(`/lessons/${lastLesson.id}`);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ padding: "40px", textAlign: "center" }}>
                    <h3>Loading Course Modules...</h3>
                </div>
            </>
        );
    }

    if (!course) {
        return (
            <>
                <Navbar />
                <div style={{ padding: "40px", textAlign: "center" }}>
                    <h3>Course not found.</h3>
                </div>
            </>
        );
    }

    const allLessons = getAllLessonsInOrder();
    const totalLessonsCount = allLessons.length;
    const completedLessonsCount = allLessons.filter(l => completedLessonIds.includes(l.id)).length;
    const progressPercent = totalLessonsCount > 0 
        ? Math.round((completedLessonsCount / totalLessonsCount) * 100) 
        : 0;

    return (
        <>
            <Navbar />

            <div className="learning-flow-container">
                <div className="course-header">
                    <div className="course-header-actions">
                        <Link to="/dashboard" className="btn-secondary">
                            ← Back to Dashboard
                        </Link>
                        <Link to={`/courses/${id}/qa`} className="btn-secondary">
                            💬 Q&A Forum
                        </Link>
                        <Link to={`/courses/${id}/chat`} className="btn-secondary">
                            🗣️ Course Chat
                        </Link>
                        {progressPercent === 100 && (
                            <Link to={`/courses/${id}/certificate`} className="btn-primary-flow">
                                🎓 Claim Certificate
                            </Link>
                        )}
                        {totalLessonsCount > 0 && (
                            <button onClick={handleContinueLearning} className="btn-primary-flow">
                                {progressPercent === 100 ? "Review Course" : "Continue Learning"} →
                            </button>
                        )}
                    </div>
                    
                    <h1>{course.title}</h1>

                    <div className="progress-section">
                        <div className="progress-info">
                            <span>Course Progress</span>
                            <span>{completedLessonsCount} / {totalLessonsCount} Lessons ({progressPercent}%)</span>
                        </div>
                        <div className="progress-bar-container">
                            <div 
                                className="progress-bar-fill" 
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="modules-list">
                    <h2>Course Syllabus</h2>
                    {modules.length === 0 ? (
                        <p>No modules yet for this course.</p>
                    ) : (
                        modules.map((module) => (
                            <div className="module-card" key={module.id}>
                                <h2>{module.title}</h2>
                                <div className="module-meta">
                                    {module.lessons ? module.lessons.length : 0} Lessons
                                </div>

                                <div className="lessons-list">
                                    {(!module.lessons || module.lessons.length === 0) ? (
                                        <p style={{ fontSize: "0.9rem", color: "gray", margin: 0 }}>
                                            No lessons in this module.
                                        </p>
                                    ) : (
                                        module.lessons.map((lesson) => {
                                            const isCompleted = completedLessonIds.includes(lesson.id);
                                            return (
                                                <Link 
                                                    to={`/lessons/${lesson.id}`} 
                                                    className="lesson-item" 
                                                    key={lesson.id}
                                                >
                                                    <div className="lesson-item-left">
                                                        <div className={`lesson-status-indicator ${isCompleted ? 'completed' : 'incomplete'}`}>
                                                            {isCompleted ? "✓" : ""}
                                                        </div>
                                                        <span className="lesson-title-text">{lesson.title}</span>
                                                    </div>
                                                    <div className="lesson-item-right">
                                                        <span className={`lesson-type-badge ${lesson.lesson_type}`}>
                                                            {lesson.lesson_type}
                                                        </span>
                                                        <span className="arrow-icon">→</span>
                                                    </div>
                                                </Link>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

export default CourseModules;
