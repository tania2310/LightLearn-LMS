import { useEffect, useState, useRef } from "react";
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

    // AI Q&A Assistant state hooks
    const [aiConversationId, setAiConversationId] = useState(null);
    const [aiMessages, setAiMessages] = useState([]);
    const [aiInput, setAiInput] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [isAiOpen, setIsAiOpen] = useState(false);
    const chatWindowRef = useRef(null);

    // Automatically load this lesson's conversation history
    useEffect(() => {
        if (role === "student" && id) {
            setAiMessages([]);
            setAiInput("");
            setAiError(null);
            setAiConversationId(null);
            API.get(`qa/ai-conversations/?lesson=${id}`)
                .then(res => {
                    if (res.data) {
                        setAiConversationId(res.data.id);
                        if (res.data.messages) {
                            setAiMessages(res.data.messages);
                        }
                    }
                })
                .catch(err => {
                    console.error("Error loading AI conversation history:", err);
                });
        }
    }, [id, role]);

    // Keep chat window scrolled to the bottom
    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [aiMessages, aiLoading, isAiOpen]);

    const handleSendAiQuestion = (e) => {
        if (e) e.preventDefault();
        if (!aiInput.trim() || aiLoading) return;

        const questionText = aiInput.trim();
        setAiInput("");
        setAiError(null);
        setAiLoading(true);

        // Optimistically append student message
        const studentMsg = {
            id: Date.now(),
            sender: "user",
            message: questionText,
            created_at: new Date().toISOString()
        };
        setAiMessages(prev => [...prev, studentMsg]);

        API.post("qa/ai-conversations/", {
            lesson: Number(id),
            question: questionText
        })
            .then(res => {
                if (res.data) {
                    setAiConversationId(res.data.conversation_id);
                    if (res.data.messages) {
                        setAiMessages(res.data.messages);
                    }
                }
            })
            .catch(err => {
                console.error("Error sending AI question:", err);
                setAiError("The AI assistant is temporarily unavailable. Your question was saved. Please try again later.");
            })
            .finally(() => {
                setAiLoading(false);
            });
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendAiQuestion();
        }
    };

    const handleClearChat = () => {
        if (!aiConversationId) return;
        if (window.confirm("Are you sure you want to clear your AI conversation history?")) {
            API.delete(`qa/ai-conversations/${aiConversationId}/clear/`)
                .then(() => {
                    setAiMessages([]);
                    setAiError(null);
                })
                .catch(err => {
                    console.error("Error clearing chat messages:", err);
                    alert("Failed to clear chat history.");
                });
        }
    };

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

    const handleTextDownload = (e) => {
        e.preventDefault();
        if (!contentUrl) return;
        
        const filename = lesson?.content ? lesson.content.split('/').pop() : `${lesson?.title || 'lesson'}.txt`;

        fetch(contentUrl)
            .then((res) => {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.blob();
            })
            .then((blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch((err) => {
                console.error("Error downloading text file:", err);
                window.location.href = contentUrl;
            });
    };

    const markComplete = () => {
        if (marking) return;
        setMarking(true);

        API.post("progress/", {
            lesson: Number(id),
            completed: true
        })
            .then(() => {
                const isAlreadyCompleted = allLessons.length > 0 && allLessons.every(l => completedLessonIds.includes(l.id));
                const willComplete = allLessons.length > 0 && allLessons.every(l => 
                    l.id === Number(id) || completedLessonIds.includes(l.id)
                );

                setCompleted(true);
                // Update completed list in local state
                if (!completedLessonIds.includes(Number(id))) {
                    setCompletedLessonIds(prev => [...prev, Number(id)]);
                }

                if (!isAlreadyCompleted && willComplete) {
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
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
                        <div className="doc-download-container" style={{ textAlign: "center", padding: "40px" }}>
                            <p style={{ fontSize: "1.1rem", marginBottom: "20px", color: "var(--text-primary)" }}>
                                This lesson is a PDF document. You can view it in a new tab or download it below.
                            </p>
                            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                                <a 
                                    href={contentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn-secondary"
                                >
                                    📄 Open PDF in New Tab
                                </a>
                                <a 
                                    href={contentUrl} 
                                    download 
                                    className="btn-download"
                                >
                                    ⬇ Download PDF
                                </a>
                            </div>
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
                                    onClick={handleTextDownload}
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
                                    onClick={isTextFile ? handleTextDownload : undefined}
                                    className="btn-download"
                                >
                                    ⬇ Download File
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {role === "student" && (
                    <div className="ai-panel">
                        <div className="ai-header" onClick={() => setIsAiOpen(!isAiOpen)}>
                            <h3>🤖 AI Learning Assistant</h3>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                {isAiOpen && aiMessages.length > 0 && (
                                    <button 
                                        className="ai-clear-btn" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearChat();
                                        }}
                                    >
                                        Clear History
                                    </button>
                                )}
                                <span>{isAiOpen ? "▲" : "▼"}</span>
                            </div>
                        </div>

                        {isAiOpen && (
                            <div className="ai-panel-content">
                                <div className="ai-chat-window" ref={chatWindowRef}>
                                    {aiMessages.length === 0 && !aiLoading && (
                                        <div className="ai-empty-state">
                                            Ask any question about this lesson to start learning with the AI Assistant!
                                        </div>
                                    )}

                                    {aiMessages.map((msg, index) => (
                                        <div
                                            key={msg.id || index}
                                            className={`ai-message ${msg.sender === "user" ? "ai-user" : "ai-assistant"}`}
                                        >
                                            <div className="ai-message-content">
                                                {msg.message}
                                            </div>
                                        </div>
                                    ))}

                                    {aiLoading && (
                                        <div className="ai-message ai-assistant ai-loading">
                                            <div className="ai-message-content">
                                                🤖 Thinking...
                                            </div>
                                        </div>
                                    )}

                                    {aiError && (
                                        <div className="ai-error-message">
                                            ⚠️ {aiError}
                                        </div>
                                    )}
                                </div>

                                <div className="ai-input">
                                    <textarea
                                        placeholder="Ask a question about this lesson..."
                                        value={aiInput}
                                        onChange={(e) => setAiInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={aiLoading}
                                        rows={2}
                                    />
                                    <button
                                        className="primary-btn ai-send-btn"
                                        onClick={handleSendAiQuestion}
                                        disabled={aiLoading || !aiInput.trim()}
                                    >
                                        Ask
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
