import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function Lessons() {
    const { moduleId } = useParams();

    const [lessons, setLessons] = useState([]);
    const [completedLessons, setCompletedLessons] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("access");

        axios
            .get("http://127.0.0.1:8000/api/lessons/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                const filtered = response.data.filter(
                    (lesson) => lesson.module === Number(moduleId)
                );

                setLessons(filtered);
            })
            .catch((error) => {
                console.log(error);
            });
        axios
            .get("http://127.0.0.1:8000/api/progress/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setCompletedLessons(
                    response.data.map((item) => item.lesson)
                );
            });
    }, [moduleId]);
    const markComplete = (lessonId) => {
        const token = localStorage.getItem("access");

        axios
            .post(
                "http://127.0.0.1:8000/api/progress/",
                {
                    lesson: lessonId,
                    completed: true,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )
            .then(() => {
                setCompletedLessons([...completedLessons, lessonId]);
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>Lessons</h1>

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
                            <h3>{lesson.title}</h3>

                            <p>
                                <strong>Type:</strong> {lesson.lesson_type}
                            </p>

                            <a
                                href={lesson.content}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open Lesson
                            </a>
                            <br />
                            <br />

                            {completedLessons.includes(lesson.id) ? (
                                <button disabled>
                                    ✓ Completed
                                </button>
                            ) : (
                                <button onClick={() => markComplete(lesson.id)}>
                                    Mark as Complete
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

export default Lessons;