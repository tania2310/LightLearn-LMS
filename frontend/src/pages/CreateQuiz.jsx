import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function CreateQuiz() {
    const { lessonId } = useParams();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState({
        lesson: lessonId,
        title: "",
        passing_score: 40,
    });

    useEffect(() => {
        setQuiz((prev) => ({
            ...prev,
            lesson: lessonId,
        }));
    }, [lessonId]);

    const handleChange = (e) => {
        setQuiz({
            ...quiz,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        API.post("quizzes/", quiz)
            .then((res) => {
                alert("Quiz created successfully.");
                navigate(`/quiz/${res.data.id}/questions`);
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "600px" }}>
                <h1>Create Quiz</h1>

                <form onSubmit={handleSubmit}>

                    <input
                        name="title"
                        placeholder="Quiz Title"
                        value={quiz.title}
                        onChange={handleChange}
                    />
                    <br /><br />

                    <button type="submit">
                        Create Quiz
                    </button>

                </form>

            </div>
        </>
    );
}

export default CreateQuiz;