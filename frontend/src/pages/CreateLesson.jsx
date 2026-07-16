import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function CreateLesson() {

    const { moduleId } = useParams();
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [lessonType, setLessonType] = useState("video");
    const [content, setContent] = useState(null);
    const [order, setOrder] = useState(1);

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();

        formData.append("module", moduleId);
        formData.append("title", title);
        formData.append("lesson_type", lessonType);
        formData.append("order", order);

        if (content) {
            formData.append("content", content);
        }

        API.post("lessons/", formData)
            .then(() => {
                alert("Lesson created successfully.");
                navigate(`/modules/${moduleId}/lessons`);
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "600px" }}>

                <h1>Create Lesson</h1>

                <form onSubmit={handleSubmit}>

                    <input
                        type="text"
                        placeholder="Lesson Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <br /><br />

                    <select
                        value={lessonType}
                        onChange={(e) => setLessonType(e.target.value)}
                    >
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="document">Document</option>
                    </select>

                    <br /><br />

                    <input
                        type="file"
                        onChange={(e) => setContent(e.target.files[0])}
                    />

                    <br /><br />

                    <input
                        type="number"
                        value={order}
                        onChange={(e) => setOrder(e.target.value)}
                    />

                    <br /><br />

                    <button type="submit">
                        Create Lesson
                    </button>

                </form>

            </div>

        </>
    );
}

export default CreateLesson;