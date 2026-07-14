import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function LessonDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("access");

        axios
            .get(`http://127.0.0.1:8000/api/lessons/${id}/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setLesson(response.data);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [id]);

    const markComplete = () => {
        const token = localStorage.getItem("access");

        axios
            .post(
                "http://127.0.0.1:8000/api/progress/",
                {
                    lesson: lesson.id,
                    completed: true,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )
            .then(() => {
                setCompleted(true);
                alert("Lesson completed!");
            })
            .catch((error) => {
                console.log(error);
            });
    };

    if (!lesson) {
        return <p>Loading...</p>;
    }
    const goToQuiz = () => {
        const token = localStorage.getItem("access");

        axios
            .get("http://127.0.0.1:8000/api/quizzes/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                const quiz = response.data.find(
                    (q) => q.lesson === lesson.id
                );

                if (quiz) {
                    navigate(`/quizzes/${quiz.id}`);
                } else {
                    alert("No quiz available for this lesson.");
                }
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>{lesson.title}</h1>

                <p>Type: {lesson.lesson_type}</p>

                {lesson.lesson_type === "video" ? (
                    <video width="700" controls>
                        <source src={lesson.content} />
                    </video>
                ) : (
                    <iframe
                        src={lesson.content}
                        width="100%"
                        height="600"
                        title="Lesson"
                    />
                )}

                <br />
                <br />
                {completed ? (
                    <>
                        <button disabled>
                            ✅ Completed
                        </button>

                        <br />
                        <br />

                        <button onClick={goToQuiz}>
                            Take Quiz
                        </button>
                    </>
                ) : (
                    <button onClick={markComplete}>
                        Mark as Completed
                    </button>
                )}

                <br />
                <br />

                <button onClick={() => navigate(-1)}>
                    Back to Modules
                </button>
            </div>
        </>
    );
}

export default LessonDetails;