import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/learningFlow.css";

function LessonViewer() {
    const { id } = useParams(); // Lesson ID
    const navigate = useNavigate();
    const role = localStorage.getItem("role");

    const [lesson, setLesson] = useState(null);
    const [moduleName, setModuleName] = useState("");
    const [courseId, setCourseId] = useState(null);
    const [allLessons, setAllLessons] = useState([]);
    const [completedLessonIds, setCompletedLessonIds] = useState([]);
    const [completed, setCompleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);
    const [courseQuizzes, setCourseQuizzes] = useState([]);
    const [textContent, setTextContent] = useState("");
    const [textLoading, setTextLoading] = useState(false);

    // Helpers to get correct media URL
    const getFileUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        return `http://127.0.0.1:8000${url}`;
    };

    useEffect(() => {
        setLoading(true);
        // Step 1: Fetch lesson details
        API.get(`lessons/${id}/`)
            .then((lessonRes) => {
                const lessonData = lessonRes.data;
                setLesson(lessonData);

                // Step 2: Fetch module details to get course ID
                return Promise.all([
                    API.get(`modules/${lessonData.module}/`),
                    API.get("progress/")
                ]);
            })
            .then(([moduleRes, progressRes]) => {
                setModuleName(moduleRes.data.title);
                const cId = moduleRes.data.course;
                setCourseId(cId);

                // Extract completed lesson IDs
                const completedIds = progressRes.data
                    .filter(item => item.completed)
                    .map(item => item.lesson);
                setCompletedLessonIds(completedIds);
                setCompleted(completedIds.includes(Number(id)));

                // Step 3: Fetch course details to reconstruct lesson order
                return Promise.all([
                    API.get(`courses/${cId}/`),
                    API.get("quizzes/").catch(() => ({ data: [] }))
                ]);
            })
            .then(([courseRes, quizzesRes]) => {
                const courseData = courseRes.data;
                const sortedMods = (courseData.modules || [])
                    .sort((a, b) => a.order - b.order)
                    .map(m => ({
                        ...m,
                        lessons: (m.lessons || []).sort((a, b) => a.order - b.order)
                    }));
                
                const lessonsFlat = sortedMods.flatMap(m => m.lessons || []);
                setAllLessons(lessonsFlat);

                const allLessonIds = lessonsFlat.map(l => l.id);
                const filteredQuizzes = quizzesRes.data.filter(q => allLessonIds.includes(q.lesson));
                setCourseQuizzes(filteredQuizzes);
            })
            .catch((error) => {
                console.error("Error loading lesson viewer content:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    const contentUrl = getFileUrl(lesson?.content);
    const isTextFile = lesson?.content && (
        lesson.content.toLowerCase().endsWith(".txt") ||
        lesson.content.toLowerCase().endsWith(".text") ||
        lesson.content.toLowerCase().endsWith(".md")
    );

    useEffect(() => {
        if (isTextFile && contentUrl) {
            setTextLoading(true);
            fetch(contentUrl)
                .then(res => res.text())
                .then(data => {
                    setTextContent(data);
                })
                .catch(err => {
                    console.error("Error fetching text content:", err);
                    setTextContent("Failed to load text lesson content.");
                })
                .finally(() => {
                    setTextLoading(false);
                });
        } else {
            setTextContent("");
        }
    }, [isTextFile, contentUrl]);

    const markComplete = () => {
        if (marking) return;
        setMarking(true);

        API.post("progress/", {
            lesson: Number(id),
            completed: true
        })
            .then(() => {
                setCompleted(true);
                // Update completed list in local state
                if (!completedLessonIds.includes(Number(id))) {
                    setCompletedLessonIds(prev => [...prev, Number(id)]);
                }
            })
            .catch((error) => {
                console.error("Error marking lesson complete:", error);
                alert("Failed to save progress.");
            })
            .finally(() => {
                setMarking(false);
            });
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ padding: "40px", textAlign: "center" }}>
                    <h3>Loading Lesson...</h3>
                </div>
            </>
        );
    }

    if (!lesson) {
        return (
            <>
                <Navbar />
                <div style={{ padding: "40px", textAlign: "center" }}>
                    <h3>Lesson not found.</h3>
                </div>
            </>
        );
    }

    const currentIdx = allLessons.findIndex(l => l.id === Number(id));
    const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
    const nextLesson = currentIdx !== -1 && currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

    const isCourseCompleted = allLessons.length > 0 && 
        allLessons.every(l => l.id === Number(id) ? completed : completedLessonIds.includes(l.id));

    return (
        <>
            <Navbar />

            <div className="viewer-container">
                {isCourseCompleted && (
                    <div className="card course-completion-card" style={{ padding: "30px", textAlign: "center", marginBottom: "30px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--card-bg)" }}>
                        <h2 style={{ color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: 0 }}>
                            <span>🎉</span> Congratulations!
                        </h2>
                        <p style={{ fontSize: "1.1rem", margin: "10px 0 20px 0", color: "var(--text-primary)" }}>
                            You have completed all lessons.
                        </p>
                        
                        {courseQuizzes.length > 0 ? (
                            <div>
                                <h3 style={{ marginBottom: "10px", color: "var(--text-primary)" }}>Next Step</h3>
                                <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>Take the Course Quiz</p>
                                <button 
                                    className="primary-btn"
                                    onClick={() => navigate(`/quiz/${courseQuizzes[0].id}`)}
                                    style={{ padding: "12px 30px" }}
                                >
                                    Start Quiz
                                </button>
                            </div>
                        ) : (
                            <p style={{ fontWeight: "600", color: "var(--success)", margin: 0 }}>Course Completed Successfully</p>
                        )}
                    </div>
                )}

                <div className="viewer-header">
                    <div className="viewer-header-meta">
                        Module: {moduleName} • Lesson {currentIdx !== -1 ? currentIdx + 1 : 0} of {allLessons.length}
                    </div>
                    <h1>{lesson.title}</h1>
                </div>

                {role === "student" && (
                    <div className="lesson-action-bar">
                        <Link to={`/courses/${courseId}/modules`} className="btn-secondary">
                            ← Modules
                        </Link>
                        <Link to={`/courses/${courseId}/qa`} className="btn-secondary">
                            💬 Q&A Forum
                        </Link>
                        <Link to={`/courses/${courseId}/chat`} className="btn-secondary">
                            🗣️ Course Chat
                        </Link>
                    </div>
                )}

                <div className={`content-display-area ${lesson.lesson_type === "video" ? "video-mode" : ""}`}>
                    {lesson.lesson_type === "video" && (
                        <div className="video-player-container">
                            <video 
                                controls 
                                className="html5-video-player"
                                key={contentUrl}
                            >
                                <source src={contentUrl} />
                                Your browser does not support HTML5 video playing.
                            </video>
                        </div>
                    )}

                    {lesson.lesson_type === "pdf" && (
                        <div className="pdf-iframe-container">
                            <iframe 
                                className="pdf-iframe" 
                                src={contentUrl} 
                                title={lesson.title}
                            ></iframe>
                        </div>
                    )}

                    {isTextFile ? (
                        <div className="text-viewer-container" style={{ textAlign: "left", background: "var(--code-bg)", padding: "30px", borderRadius: "12px", border: "1px solid var(--border)", minHeight: "200px" }}>
                            {textLoading ? (
                                <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading text content...</p>
                            ) : (
                                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", color: "var(--text-primary)", margin: 0, fontSize: "1rem", lineHeight: "1.6" }}>
                                    {textContent}
                                </pre>
                            )}
                            <hr style={{ margin: "25px 0", border: "none", borderTop: "1px solid var(--border)" }} />
                            <div style={{ display: "flex", gap: "15px", justifyContent: "flex-end" }}>
                                <a 
                                    href={contentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn-secondary"
                                    style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                                >
                                    📄 Open in New Window
                                </a>
                                <a 
                                    href={contentUrl} 
                                    download 
                                    className="btn-download"
                                    style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                                >
                                    ⬇ Download File
                                </a>
                            </div>
                        </div>
                    ) : (lesson.lesson_type === "text" || lesson.lesson_type === "document") && (
                        <div className="doc-download-container">
                            <p>This lesson is a document/text file. You can download or view it in a new window.</p>
                            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                                <a 
                                    href={contentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn-secondary"
                                >
                                    📄 Open in New Window
                                </a>
                                <a 
                                    href={contentUrl} 
                                    download 
                                    className="btn-download"
                                >
                                    ⬇ Download File
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                <div className="viewer-actions">
                    <button 
                        onClick={() => navigate(`/courses/${courseId}/modules`)} 
                        className="btn-secondary"
                    >
                        ← Back to Modules
                    </button>

                    <div className="nav-buttons">
                        <button 
                            onClick={() => navigate(`/lessons/${prevLesson.id}`)} 
                            disabled={!prevLesson}
                            className="btn-nav"
                        >
                            Previous Lesson
                        </button>

                        <button 
                            onClick={() => navigate(`/lessons/${nextLesson.id}`)} 
                            disabled={!nextLesson}
                            className="btn-nav"
                        >
                            Next Lesson
                        </button>
                    </div>

                    {completed ? (
                        <button disabled className="btn-complete">
                            ✓ Completed
                        </button>
                    ) : (
                        <button 
                            onClick={markComplete} 
                            disabled={marking} 
                            className="btn-complete"
                        >
                            {marking ? "Saving..." : "Mark Complete"}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

export default LessonViewer;
