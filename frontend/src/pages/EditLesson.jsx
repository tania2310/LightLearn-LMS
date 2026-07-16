import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function EditLesson() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState({
        title: "",
        lesson_type: "video",
        order: 1,
        module: "",
    });

    const [content, setContent] = useState(null);

    useEffect(() => {
        API.get(`lessons/${id}/`)
            .then((res) => {
                setLesson(res.data);
            })
            .catch(console.log);
    }, [id]);

    const handleChange = (e) => {
        setLesson({
            ...lesson,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();

        formData.append("module", lesson.module);
        formData.append("title", lesson.title);
        formData.append("lesson_type", lesson.lesson_type);
        formData.append("order", lesson.order);

        if (content) {
            formData.append("content", content);
        }

        API.put(`lessons/${id}/`, formData)
            .then(() => {
                alert("Lesson updated.");
                navigate(`/modules/${lesson.module}/lessons`);
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "600px" }}>

                <h1>Edit Lesson</h1>

                <form onSubmit={handleSubmit}>

                    <input
                        name="title"
                        value={lesson.title}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <select
                        name="lesson_type"
                        value={lesson.lesson_type}
                        onChange={handleChange}
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
                        name="order"
                        value={lesson.order}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <button type="submit">
                        Save Changes
                    </button>

                </form>

            </div>

        </>
    );
}

export default EditLesson;