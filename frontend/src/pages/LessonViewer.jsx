import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/learningFlow.css";

function LessonViewer() {
    const { id } = useParams(); // Lesson ID
    const navigate = useNavigate();

    const [lesson, setLesson] = useState(null);
    const [moduleName, setModuleName] = useState("");
    const [courseId, setCourseId] = useState(null);
    const [allLessons, setAllLessons] = useState([]);
    const [completedLessonIds, setCompletedLessonIds] = useState([]);
    const [completed, setCompleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);

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
                return API.get(`courses/${cId}/`);
            })
            .then((courseRes) => {
                const courseData = courseRes.data;
                const sortedMods = (courseData.modules || [])
                    .sort((a, b) => a.order - b.order)
                    .map(m => ({
                        ...m,
                        lessons: (m.lessons || []).sort((a, b) => a.order - b.order)
                    }));
                
                const lessonsFlat = sortedMods.flatMap(m => m.lessons || []);
                setAllLessons(lessonsFlat);
            })
            .catch((error) => {
                console.error("Error loading lesson viewer content:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

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

    const contentUrl = getFileUrl(lesson.content);

    return (
        <>
            <Navbar />

            <div className="viewer-container">
                {isCourseCompleted && (
                    <div className="course-completed-banner">
                        <span>🏆</span>
                        <span>Congratulations! You have completed all lessons in this course!</span>
                    </div>
                )}

                <div className="viewer-header">
                    <div className="viewer-header-meta">
                        Module: {moduleName} • Lesson {currentIdx !== -1 ? currentIdx + 1 : 0} of {allLessons.length}
                    </div>
                    <h1>{lesson.title}</h1>
                </div>

                <div className="content-display-area">
                    {lesson.lesson_type === "video" && (
                        <video 
                            controls 
                            className="html5-video-player"
                            key={contentUrl}
                        >
                            <source src={contentUrl} />
                            Your browser does not support HTML5 video playing.
                        </video>
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

                    {(lesson.lesson_type === "text" || lesson.lesson_type === "document") && (
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
