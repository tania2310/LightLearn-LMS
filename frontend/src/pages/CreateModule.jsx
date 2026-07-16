import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function CreateModule() {

    const { courseId } = useParams();
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [order, setOrder] = useState(1);

    const handleSubmit = (e) => {
        e.preventDefault();

        API.post("modules/", {
            course: courseId,
            title,
            description,
            order,
        })
            .then(() => {
                alert("Module created successfully.");
                navigate(`/courses/${courseId}/modules`);
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "600px" }}>
                <h1>Create Module</h1>

                <form onSubmit={handleSubmit}>

                    <input
                        type="text"
                        placeholder="Module Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <br /><br />

                    <textarea
                        rows="5"
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <br /><br />

                    <input
                        type="number"
                        value={order}
                        onChange={(e) => setOrder(e.target.value)}
                    />

                    <br /><br />

                    <button type="submit">
                        Create Module
                    </button>

                </form>

            </div>
        </>
    );
}

export default CreateModule;