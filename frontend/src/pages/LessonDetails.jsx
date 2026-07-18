import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import LessonViewer from "./LessonViewer";
import "../styles/learningFlow.css";

function LessonDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState(null);
    const [completed, setCompleted] = useState(false);
    const role = localStorage.getItem("role");

    if (role === "student") {
        return <LessonViewer />;
    }

    useEffect(() => {
        API
            .get(`lessons/${id}/`)
            .then((response) => {
                setLesson(response.data);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [id]);

    const markComplete = () => {
        API
            .post("progress/", {
                lesson: lesson.id,
                completed: true,
            })
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
    const fileUrl = lesson.content;
    console.log("Lesson:", lesson);
    console.log("File URL:", fileUrl);

    const goToQuiz = () => {
        API
            .get(`quizzes/?lesson=${lesson.id}`)
            .then((response) => {
                if (response.data.length > 0) {
                    navigate(`/quiz/${response.data[0].id}`);
                } else {
                    alert("No quiz available for this lesson.");
                }
            })
            .catch((error) => {
                console.log(error);
            });
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>{lesson.title}</h1>
                <p>
                    <strong>Lesson Type:</strong> {lesson.lesson_type}
                </p>

                <p>
                    <strong>Lesson Order:</strong> {lesson.order}
                </p>

                <hr />

                {lesson.lesson_type === "video" && (
                    <div className="video-player-container" style={{ marginTop: "20px" }}>
                        <video
                            controls
                            className="html5-video-player"
                        >
                            <source src={fileUrl} />
                            Your browser does not support video.
                        </video>
                    </div>
                )}

                {lesson.lesson_type === "pdf" && (
                    <div style={{ marginTop: "20px" }}>
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            📄 View PDF
                        </a>

                        <br /><br />

                        <a href={fileUrl} download>
                            ⬇ Download PDF
                        </a>
                    </div>
                )}

                {lesson.lesson_type === "document" && (
                    <div style={{ marginTop: "20px" }}>
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            📑 Open Document
                        </a>
                    </div>
                )}
                <div
                    style={{
                        marginTop: "30px",
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                    }}
                >
                    {role === "student" && (
                        <>
                            {completed ? (
                                <button disabled>✅ Completed</button>
                            ) : (
                                <button onClick={markComplete}>
                                    Mark as Completed
                                </button>
                            )}

                            <button onClick={goToQuiz}>
                                Take Quiz
                            </button>
                        </>
                    )}

                    {role === "mentor" && (
                        <button
                            onClick={() =>
                                navigate(`/lessons/${lesson.id}/create-quiz`)
                            }
                        >
                            Create Quiz
                        </button>
                    )}

                    <button onClick={() => navigate(-1)}>
                        Back
                    </button>
                </div>
            </div>
        </>
    );

}

export default LessonDetails;