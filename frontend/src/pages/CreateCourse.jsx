import { useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

function CreateCourse() {
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [level, setLevel] = useState("beginner");
    const [language, setLanguage] = useState("English");
    const [duration, setDuration] = useState("");
    const [price, setPrice] = useState("");
    const [thumbnail, setThumbnail] = useState(null);
    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();

        formData.append("title", title);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("level", level);
        formData.append("language", language);
        formData.append("duration", duration);
        formData.append("price", price);

        if (thumbnail) {
            formData.append("thumbnail", thumbnail);
        }

        API.post("courses/", formData)
            .then(() => {
                alert("Course submitted for approval.");
                navigate("/mentor");
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "700px" }}>
                <h1>Create Course</h1>

                <form onSubmit={handleSubmit}>

                    <input
                        type="text"
                        placeholder="Course Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <br /><br />

                    <textarea
                        rows="6"
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <br /><br />

                    <input
                        type="text"
                        placeholder="Category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    />

                    <br /><br />

                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbnail(e.target.files[0])}
                    />

                    <br /><br />

                    <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>

                    <br /><br />

                    <input
                        type="text"
                        placeholder="Language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    />

                    <br /><br />

                    <input
                        type="number"
                        placeholder="Duration (hours)"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                    />

                    <br /><br />

                    <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                    />

                    <br /><br />

                    <button type="submit">
                        Create Course
                    </button>
                    <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                    <br /><br />


                </form>
            </div>
        </>
    );
}

export default CreateCourse;