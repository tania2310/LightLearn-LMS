import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function Quiz() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        Promise.all([
            API.get(`quizzes/${id}/`),
            API.get("questions/"),
        ])
            .then(([quizRes, questionRes]) => {
                setQuiz(quizRes.data);

                const filtered = questionRes.data.filter(
                    q => q.quiz === Number(id)
                );

                setQuestions(filtered);
            })
            .catch(console.log);
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

                alert(
                    `Score: ${data.score}/${data.total}\n${data.passed ? "PASS 🎉" : "FAIL ❌"
                    }`
                );

                navigate("/dashboard");
            })
            .catch(console.log);
    };

    if (!quiz) return <p>Loading...</p>;

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>{quiz.title}</h1>

                {questions.map((q, index) => (
                    <div
                        key={q.id}
                        style={{
                            border: "1px solid #ddd",
                            padding: "20px",
                            marginBottom: "20px",
                            borderRadius: "10px",
                        }}
                    >
                        <h3>
                            {index + 1}. {q.question}
                        </h3>

                        {[1, 2, 3, 4].map(num => (
                            <div key={num}>
                                <label>
                                    <input
                                        type="radio"
                                        name={`question-${q.id}`}
                                        checked={answers[q.id] === num}
                                        onChange={() =>
                                            handleAnswer(q.id, num)
                                        }
                                    />

                                    {" "}

                                    {q[`option${num}`]}
                                </label>
                            </div>
                        ))}
                    </div>
                ))}

                <button onClick={submitQuiz}>
                    Submit Quiz
                </button>
                <button
                    onClick={() => navigate(-1)}
                    style={{ marginLeft: "10px" }}
                >
                    Cancel
                </button>

            </div>
        </>
    );
}

export default Quiz;