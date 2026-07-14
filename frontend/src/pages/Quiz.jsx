import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function Quiz() {
    const { id } = useParams();

    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("access");

        axios
            .get(`http://127.0.0.1:8000/api/quizzes/${id}/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setQuiz(response.data);
                const token = localStorage.getItem("access");

                axios
                    .get("http://127.0.0.1:8000/api/questions/", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    })
                    .then((res) => {
                        const quizQuestions = res.data.filter(
                            (q) => q.quiz === Number(id)
                        );

                        setQuestions(quizQuestions);
                    });
            })
            .catch(console.log);
    }, [id]);

    if (!quiz) return <p>Loading...</p>;
    const handleAnswer = (questionId, option) => {
        setAnswers({
            ...answers,
            [questionId]: option,
        });
    };
    const submitQuiz = () => {
        const token = localStorage.getItem("access");

        axios
            .post(
                `http://127.0.0.1:8000/api/quizzes/${quiz.id}/submit/`,
                {
                    answers,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )
            .then((response) => {
                setScore(response.data.score);
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>{quiz.title}</h1>
                {questions.map((question, index) => (
                    <div
                        key={question.id}
                        style={{
                            border: "1px solid #ccc",
                            padding: "20px",
                            marginTop: "20px",
                            borderRadius: "8px",
                        }}
                    >
                        <h3>
                            {index + 1}. {question.question}
                        </h3>

                        <label>
                            <input
                                type="radio"
                                name={`question-${question.id}`}
                                value="1"
                                onChange={() => handleAnswer(question.id, 1)}
                            />
                            {question.option1}
                        </label>

                        <br />

                        <label>
                            <input
                                type="radio"
                                name={`question-${question.id}`}
                                value="2"
                                onChange={() => handleAnswer(question.id, 2)}
                            />
                            {question.option2}
                        </label>

                        <br />

                        <label>
                            <input
                                type="radio"
                                name={`question-${question.id}`}
                                value="3"
                                onChange={() => handleAnswer(question.id, 3)}
                            />
                            {question.option3}
                        </label>

                        <br />

                        <label>
                            <input
                                type="radio"
                                name={`question-${question.id}`}
                                value="4"
                                onChange={() => handleAnswer(question.id, 4)}
                            />
                            {question.option4}
                        </label>
                        <br />

                        <button onClick={submitQuiz}>
                            Submit Quiz
                        </button>
                        {score !== null && (
                            <div style={{ marginTop: "20px" }}>
                                <h2>
                                    Score: {score} / {questions.length}
                                </h2>
                            </div>
                        )}
                    </div>
                ))}

            </div>
        </>
    );
}

export default Quiz;