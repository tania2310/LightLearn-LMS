import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function Lessons() {
    const { moduleId } = useParams();
    const role = localStorage.getItem("role");

    const [lessons, setLessons] = useState([]);
    const [completedLessons, setCompletedLessons] = useState([]);

    useEffect(() => {
        Promise.all([
            API.get("lessons/"),
            API.get("progress/"),
        ])
            .then(([lessonResponse, progressResponse]) => {
                const filtered = lessonResponse.data.filter(
                    (lesson) => lesson.module === Number(moduleId)
                );

                setLessons(filtered);

                setCompletedLessons(
                    progressResponse.data.map((item) => item.lesson)
                );
            })
            .catch((error) => {
                console.log(error);
            });
    }, [moduleId]);

    const markComplete = (lessonId) => {
        API
            .post("progress/", {
                lesson: lessonId,
                completed: true,
            })
            .then(() => {
                setCompletedLessons((prev) => [...prev, lessonId]);
            })
            .catch((error) => {
                console.log(error);
            });
    };
    const deleteLesson = (lessonId) => {

        if (!window.confirm("Delete this lesson?")) return;

        API.delete(`lessons/${lessonId}/`)
            .then(() => {

                alert("Lesson deleted.");

                setLessons(prev =>
                    prev.filter(lesson => lesson.id !== lessonId)
                );

            })
            .catch(console.log);
    };
    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>Lessons</h1>
                {role === "mentor" && (
                    <>
                        <Link to={`/modules/${moduleId}/lessons/create`}>
                            <button>Add Lesson</button>
                        </Link>

                        <br /><br />
                    </>
                )}

                {lessons.length === 0 ? (
                    <p>No lessons yet.</p>
                ) : (
                    lessons.map((lesson) => (
                        <div
                            key={lesson.id}
                            style={{
                                border: "1px solid gray",
                                padding: "15px",
                                marginBottom: "15px",
                                borderRadius: "8px",
                            }}
                        >
                            <h3><Link to={`/lessons/${lesson.id}`}>
                                {lesson.title}
                            </Link>
                            </h3>

                            <p>
                                <strong>Type:</strong> {lesson.lesson_type}
                            </p>

                            <Link to={`/lessons/${lesson.id}`}>
                                Open Lesson
                            </Link>

                            <br /><br />

                            {role === "student" ? (
                                completedLessons.includes(lesson.id) ? (
                                    <button disabled>
                                        ✓ Completed
                                    </button>
                                ) : (
                                    <button onClick={() => markComplete(lesson.id)}>
                                        Mark as Complete
                                    </button>
                                )
                            ) : (
                                <>
                                    <Link to={`/lessons/${lesson.id}/edit`}>
                                        <button>Edit</button>
                                    </Link>

                                    {" "}

                                    <button
                                        onClick={() => deleteLesson(lesson.id)}
                                        style={{
                                            background: "#dc3545",
                                            color: "white",
                                        }}
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

export default Lessons;