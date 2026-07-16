import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function EditCourse() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState({
        title: "",
        description: "",
        category: "",
        level: "beginner",
        language: "",
        duration: "",
        price: "",
    });

    useEffect(() => {
        API.get(`courses/${id}/`)
            .then((response) => {
                setCourse(response.data);
            })
            .catch(console.log);
    }, [id]);

    const handleChange = (e) => {
        setCourse({
            ...course,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        API.put(`courses/${id}/`, course)
            .then(() => {
                alert("Course updated successfully.");
                navigate("/mentor");
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "700px" }}>
                <h1>Edit Course</h1>

                <form onSubmit={handleSubmit}>

                    <input
                        name="title"
                        value={course.title}
                        onChange={handleChange}
                        placeholder="Title"
                    />

                    <br /><br />

                    <textarea
                        name="description"
                        rows="5"
                        value={course.description}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <input
                        name="category"
                        value={course.category}
                        onChange={handleChange}
                        placeholder="Category"
                    />

                    <br /><br />

                    <select
                        name="level"
                        value={course.level}
                        onChange={handleChange}
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>

                    <br /><br />

                    <input
                        name="language"
                        value={course.language}
                        onChange={handleChange}
                        placeholder="Language"
                    />

                    <br /><br />

                    <input
                        type="number"
                        name="duration"
                        value={course.duration}
                        onChange={handleChange}
                        placeholder="Duration"
                    />

                    <br /><br />

                    <input
                        type="number"
                        step="0.01"
                        name="price"
                        value={course.price}
                        onChange={handleChange}
                        placeholder="Price"
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

export default EditCourse;