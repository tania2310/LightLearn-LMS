import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function Quiz() {
    const { id } = useParams(); // Quiz ID
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    
    // Pagination & workflow states
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [locked, setLocked] = useState(true);
    const [courseId, setCourseId] = useState(null);
    const [submissionResult, setSubmissionResult] = useState(null);

    useEffect(() => {
        setLoading(true);
        API.get(`quizzes/${id}/`)
            .then((quizRes) => {
                const quizData = quizRes.data;
                setQuiz(quizData);

                // Fetch questions, lesson details, and progress
                return Promise.all([
                    API.get("questions/"),
                    API.get(`lessons/${quizData.lesson}/`),
                    API.get("progress/")
                ]);
            })
            .then(([questionRes, lessonRes, progressRes]) => {
                // Filter questions for this quiz
                const filteredQuestions = questionRes.data.filter(
                    q => q.quiz === Number(id)
                );
                setQuestions(filteredQuestions);

                const lessonData = lessonRes.data;
                // Fetch module to get course ID
                return Promise.all([
                    API.get(`modules/${lessonData.module}/`),
                    Promise.resolve(progressRes.data)
                ]);
            })
            .then(([moduleRes, progressData]) => {
                const cId = moduleRes.data.course;
                setCourseId(cId);

                // Fetch course to get all lessons
                return Promise.all([
                    API.get(`courses/${cId}/`),
                    Promise.resolve(progressData)
                ]);
            })
            .then(([courseRes, progressData]) => {
                const courseData = courseRes.data;
                const sortedMods = courseData.modules || [];
                const lessonsFlat = sortedMods.flatMap(m => m.lessons || []);

                const completedIds = progressData
                    .filter(item => item.completed)
                    .map(item => item.lesson);

                // Check if all lessons are completed
                const allCompleted = lessonsFlat.length > 0 && lessonsFlat.every(l => completedIds.includes(l.id));
                setLocked(!allCompleted);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error loading quiz content:", error);
                setLoading(false);
            });
    }, [id]);

    const handleAnswer = (questionId, option) => {
        setAnswers({
            ...answers,
            [questionId]: option,
        });
    };

    const submitQuiz = () => {
        if (Object.keys(answers).length !== questions.length) {
            alert("Please answer all questions.");
            return;
        }

        API.post(`quizzes/${quiz.id}/submit/`, {
            answers: answers,
        })
            .then((response) => {
                const data = response.data;
                setSubmissionResult(data);
                if (data.passed) {
                    localStorage.setItem(`quiz_passed_${courseId}`, "true");
                } else {
                    localStorage.removeItem(`quiz_passed_${courseId}`);
                }
            })
            .catch((error) => {
                console.error("Error submitting quiz:", error);
                alert("Failed to submit quiz.");
            });
    };

    const retakeQuiz = () => {
        setAnswers({});
        setCurrentQuestionIndex(0);
        setSubmissionResult(null);
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div style={{ padding: "80px 40px", textAlign: "center" }}>
                    <h3>Loading Quiz Content...</h3>
                </div>
            </>
        );
    }

    if (locked) {
        return (
            <>
                <Navbar />
                <div className="quiz-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                    <div className="card" style={{ maxWidth: "500px", width: "100%", padding: "40px", textAlign: "center" }}>
                        <div style={{ fontSize: "3.5rem", marginBottom: "15px" }}>🔒</div>
                        <h2 style={{ marginBottom: "15px", color: "var(--text-primary)" }}>Quiz Locked</h2>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "30px", fontSize: "1.05rem" }}>
                            Complete all lessons first.
                        </p>
                        <button 
                            className="primary-btn" 
                            onClick={() => navigate(`/courses/${courseId}/modules`)}
                            style={{ padding: "12px 30px" }}
                        >
                            Continue Learning
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // Results Screen rendering
    if (submissionResult) {
        const scorePercent = Math.round((submissionResult.score / submissionResult.total) * 100);
        return (
            <>
                <Navbar />
                <div className="quiz-results-container">
                    <div className="card" style={{ padding: "40px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--card-bg)" }}>
                        <h2 style={{ color: "var(--text-primary)", margin: 0 }}>Quiz Completed</h2>
                        
                        <div className="quiz-results-score-value">
                            {scorePercent}%
                        </div>

                        {submissionResult.passed ? (
                            <div>
                                <div className="quiz-results-status passed">Passed</div>
                                <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", margin: "15px 0 30px 0" }}>
                                    Congratulations! You are now eligible for a certificate.
                                </p>
                                <button 
                                    className="primary-btn"
                                    onClick={() => navigate(`/courses/${courseId}/certificate`)}
                                    style={{ padding: "12px 30px" }}
                                >
                                    Apply for Certificate
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="quiz-results-status failed">Failed</div>
                                <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", margin: "15px 0 30px 0" }}>
                                    Minimum Passing Score: 50%
                                </p>
                                <button 
                                    className="primary-btn"
                                    onClick={retakeQuiz}
                                    style={{ padding: "12px 30px" }}
                                >
                                    Retake Quiz
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const progressPercent = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

    return (
        <>
            <Navbar />

            <div className="quiz-container">
                <div className="quiz-header">
                    <h1 style={{ color: "var(--text-primary)", margin: 0 }}>{quiz.title}</h1>
                    <div className="quiz-meta">Module Quiz</div>
                </div>

                <div className="quiz-progress-text">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                </div>
                <div className="quiz-progress-bar-container">
                    <div className="quiz-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>

                {currentQuestion && (
                    <div className="card" style={{ padding: "30px", marginBottom: "25px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--card-bg)" }}>
                        <h3 className="quiz-question-title">
                            {currentQuestion.question}
                        </h3>

                        <div className="quiz-options-list">
                            {[1, 2, 3, 4].map((num) => (
                                <div 
                                    key={num}
                                    className={`quiz-option-card ${answers[currentQuestion.id] === num ? "selected" : ""}`}
                                    onClick={() => handleAnswer(currentQuestion.id, num)}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${currentQuestion.id}`}
                                        checked={answers[currentQuestion.id] === num}
                                        onChange={() => handleAnswer(currentQuestion.id, num)}
                                    />
                                    <span className="quiz-option-text">
                                        {currentQuestion[`option${num}`]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="quiz-nav-actions">
                    <button 
                        className="secondary-btn"
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        style={{ minWidth: "100px" }}
                    >
                        Previous
                    </button>

                    {currentQuestionIndex === totalQuestions - 1 ? (
                        <button 
                            className="primary-btn"
                            onClick={submitQuiz}
                            style={{ minWidth: "120px" }}
                        >
                            Submit Quiz
                        </button>
                    ) : (
                        <button 
                            className="primary-btn"
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                            style={{ minWidth: "100px" }}
                        >
                            Next
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

export default Quiz;