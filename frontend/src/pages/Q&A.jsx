import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import "../styles/learningFlow.css";
import "../styles/learningFlowExtras.css";

function QA() {
    const { id: courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    
    // UI state
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("newest"); // "newest", "unanswered"
    const [newQuestion, setNewQuestion] = useState("");
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [editingQuestionText, setEditingQuestionText] = useState("");
    
    // Mentor answers state
    const [newAnswer, setNewAnswer] = useState({});
    const [editingAnswerId, setEditingAnswerId] = useState(null);
    const [editingAnswerText, setEditingAnswerText] = useState("");

    useEffect(() => {
        // Fetch course details
        API.get(`courses/${courseId}/`)
            .then(res => setCourse(res.data))
            .catch(console.log);

        // Fetch current user details
        API.get("accounts/profile/")
            .then(res => setCurrentUser(res.data))
            .catch(console.log);

        // Fetch all questions
        fetchQuestions();
    }, [courseId]);

    const fetchQuestions = () => {
        API.get("questions/")
            .then(res => {
                // Filter questions for this course
                const courseQs = res.data.filter(q => q.course === Number(courseId));
                setQuestions(courseQs);
            })
            .catch(console.log);
    };

    // Question Actions
    const handleAskQuestion = (e) => {
        e.preventDefault();
        if (!newQuestion.trim()) return;

        API.post("questions/", {
            course: Number(courseId),
            question: newQuestion
        })
            .then(() => {
                setNewQuestion("");
                fetchQuestions();
            })
            .catch(console.log);
    };

    const handleStartEditQuestion = (q) => {
        setEditingQuestionId(q.id);
        setEditingQuestionText(q.question);
    };

    const handleSaveEditQuestion = (qid) => {
        if (!editingQuestionText.trim()) return;

        API.put(`questions/${qid}/`, {
            course: Number(courseId),
            question: editingQuestionText
        })
            .then(() => {
                setEditingQuestionId(null);
                fetchQuestions();
            })
            .catch(console.log);
    };

    const handleDeleteQuestion = (qid) => {
        if (!window.confirm("Are you sure you want to delete this question?")) return;

        API.delete(`questions/${qid}/`)
            .then(() => {
                fetchQuestions();
            })
            .catch(console.log);
    };

    // Answer Actions
    const handlePostAnswer = (qid) => {
        const text = newAnswer[qid];
        if (!text || !text.trim()) return;

        API.post("answers/", {
            question: qid,
            answer: text
        })
            .then(() => {
                setNewAnswer(prev => ({ ...prev, [qid]: "" }));
                fetchQuestions();
            })
            .catch(console.log);
    };

    const handleStartEditAnswer = (a) => {
        setEditingAnswerId(a.id);
        setEditingAnswerText(a.answer);
    };

    const handleSaveEditAnswer = (aid, qid) => {
        if (!editingAnswerText.trim()) return;

        API.put(`answers/${aid}/`, {
            question: qid,
            answer: editingAnswerText
        })
            .then(() => {
                setEditingAnswerId(null);
                fetchQuestions();
            })
            .catch(console.log);
    };

    const handleDeleteAnswer = (aid) => {
        if (!window.confirm("Are you sure you want to delete this answer?")) return;

        API.delete(`answers/${aid}/`)
            .then(() => {
                fetchQuestions();
            })
            .catch(console.log);
    };

    // Filtered and Sorted Questions
    const getFilteredQuestions = () => {
        let result = [...questions];

        // Search filter
        if (search.trim()) {
            result = result.filter(q => 
                q.question.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Sorting / Unanswered filter
        if (filter === "newest") {
            result.sort((a, b) => b.id - a.id);
        } else if (filter === "unanswered") {
            result = result.filter(q => !q.answers || q.answers.length === 0);
            result.sort((a, b) => b.id - a.id);
        }

        return result;
    };

    const filteredQuestions = getFilteredQuestions();

    return (
        <>
            <Navbar />
            <div className="qa-container">
                <div className="qa-header">
                    <button className="btn-secondary" onClick={() => navigate(`/courses/${courseId}/modules`)}>
                        ← Back to Learning
                    </button>
                    <h1 style={{ marginTop: "20px" }}>Q&A Forum</h1>
                    {course && <p style={{ color: "var(--text)" }}>Course: {course.title}</p>}
                </div>

                {/* Ask a Question Form (For Students) */}
                {currentUser && currentUser.role === "student" && (
                    <form className="qa-ask-form" onSubmit={handleAskQuestion}>
                        <h3 style={{ margin: "0 0 15px 0" }}>Ask a Question</h3>
                        <textarea
                            placeholder="What is your question? Be specific and clear..."
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                        />
                        <button type="submit" className="btn-primary-flow">
                            Post Question
                        </button>
                    </form>
                )}

                {/* Search and Filters */}
                <div className="qa-controls">
                    <input
                        type="text"
                        className="qa-search-input"
                        placeholder="Search questions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button 
                        className={`qa-filter-btn ${filter === "newest" ? "active" : ""}`}
                        onClick={() => setFilter("newest")}
                    >
                        Newest
                    </button>
                    <button 
                        className={`qa-filter-btn ${filter === "unanswered" ? "active" : ""}`}
                        onClick={() => setFilter("unanswered")}
                    >
                        Unanswered
                    </button>
                </div>

                {/* Questions List */}
                <div className="qa-list">
                    {filteredQuestions.length === 0 ? (
                        <p style={{ color: "var(--text)", textAlign: "center" }}>No questions found.</p>
                    ) : (
                        filteredQuestions.map(q => {
                            const isOwnQuestion = currentUser && q.student === currentUser.id;
                            const hasAnswers = q.answers && q.answers.length > 0;

                            return (
                                <div key={q.id} className="qa-question-card">
                                    <div className="qa-question-meta">
                                        <span>
                                            Asked by <strong>{q.student_username || `User #${q.student}`}</strong>
                                        </span>
                                        <span className={`qa-status-badge ${hasAnswers ? 'answered' : 'unanswered'}`}>
                                            {hasAnswers ? `${q.answers.length} Answers` : "Unanswered"}
                                        </span>
                                    </div>

                                    {editingQuestionId === q.id ? (
                                        <div>
                                            <textarea
                                                className="qa-ask-form textarea"
                                                style={{ width: "100%", height: "80px", marginBottom: "10px" }}
                                                value={editingQuestionText}
                                                onChange={(e) => setEditingQuestionText(e.target.value)}
                                            />
                                            <div className="qa-actions">
                                                <button className="qa-btn-link" onClick={() => handleSaveEditQuestion(q.id)}>
                                                    Save
                                                </button>
                                                <button className="qa-btn-link" onClick={() => setEditingQuestionId(null)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="qa-question-text">{q.question}</div>
                                            {isOwnQuestion && (
                                                <div className="qa-actions">
                                                    <button className="qa-btn-link" onClick={() => handleStartEditQuestion(q)}>
                                                        Edit
                                                    </button>
                                                    <button className="qa-btn-link qa-btn-delete" onClick={() => handleDeleteQuestion(q.id)}>
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Answers Section */}
                                    <div className="qa-answers-section">
                                        <h4 className="qa-answers-title">Answers</h4>
                                        {q.answers && q.answers.map(a => {
                                            const isOwnAnswer = currentUser && a.mentor === currentUser.id;

                                            return (
                                                <div key={a.id} className="qa-answer-card">
                                                    <div className="qa-answer-meta">
                                                        <span>
                                                            Answered by Mentor <strong>{a.mentor_username || `Mentor #${a.mentor}`}</strong>
                                                        </span>
                                                    </div>

                                                    {editingAnswerId === a.id ? (
                                                        <div>
                                                            <textarea
                                                                style={{ width: "100%", height: "60px", marginBottom: "10px" }}
                                                                value={editingAnswerText}
                                                                onChange={(e) => setEditingAnswerText(e.target.value)}
                                                            />
                                                            <div className="qa-actions">
                                                                <button className="qa-btn-link" onClick={() => handleSaveEditAnswer(a.id, q.id)}>
                                                                    Save
                                                                </button>
                                                                <button className="qa-btn-link" onClick={() => setEditingAnswerId(null)}>
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="qa-answer-text">{a.answer}</div>
                                                            {isOwnAnswer && (
                                                                <div className="qa-actions">
                                                                    <button className="qa-btn-link" onClick={() => handleStartEditAnswer(a)}>
                                                                        Edit
                                                                    </button>
                                                                    <button className="qa-btn-link qa-btn-delete" onClick={() => handleDeleteAnswer(a.id)}>
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Post Answer Form (For Mentors) */}
                                        {currentUser && currentUser.role === "mentor" && (
                                            <div style={{ marginTop: "15px" }}>
                                                <textarea
                                                    style={{ width: "100%", height: "60px", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "8px" }}
                                                    placeholder="Type your answer as a mentor..."
                                                    value={newAnswer[q.id] || ""}
                                                    onChange={(e) => setNewAnswer({ ...newAnswer, [q.id]: e.target.value })}
                                                />
                                                <button className="btn-primary-flow" onClick={() => handlePostAnswer(q.id)}>
                                                    Post Answer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}

export default QA;
