import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function EditModule() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [module, setModule] = useState({
        title: "",
        description: "",
        order: 1,
    });

    useEffect(() => {
        API.get(`modules/${id}/`)
            .then((res) => {
                setModule(res.data);
            })
            .catch(console.log);
    }, [id]);

    const handleChange = (e) => {
        setModule({
            ...module,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {

        e.preventDefault();

        API.put(`modules/${id}/`, module)
            .then(() => {

                alert("Module updated.");

                navigate(`/courses/${module.course}/modules`);

            })
            .catch(console.log);

    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "600px" }}>

                <h1>Edit Module</h1>

                <form onSubmit={handleSubmit}>

                    <input
                        name="title"
                        value={module.title}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <textarea
                        rows="5"
                        name="description"
                        value={module.description}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <input
                        type="number"
                        name="order"
                        value={module.order}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <button>
                        Save Changes
                    </button>

                </form>

            </div>

        </>
    );

}

export default EditModule;