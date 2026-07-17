import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import CourseModules from "./CourseModules";

function Modules() {
    const { id } = useParams();
    const role = localStorage.getItem("role");

    if (role === "student") {
        return <CourseModules />;
    }

    const [modules, setModules] = useState([]);

    useEffect(() => {
        API
            .get("modules/")
            .then((response) => {
                const filtered = response.data.filter(
                    (module) => module.course === Number(id)
                );

                setModules(filtered);
            })
            .catch((error) => {
                console.log(error);
            });
    }, [id]);

    const deleteModule = (moduleId) => {

        if (!window.confirm("Delete this module?")) return;

        API.delete(`modules/${moduleId}/`)
            .then(() => {

                alert("Module deleted.");

                setModules(prev =>
                    prev.filter(module => module.id !== moduleId)
                );

            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>Modules</h1>
                {role === "mentor" && (
                    <>
                        <Link to={`/courses/${id}/modules/create`}>
                            <button>Add Module</button>
                        </Link>

                        <br /><br />
                    </>
                )}

                {modules.length === 0 ? (
                    <p>No modules yet.</p>
                ) : (
                    modules.map((module) => (
                        <div
                            key={module.id}
                            style={{
                                border: "1px solid #ddd",
                                padding: 20,
                                borderRadius: 10,
                                marginBottom: 20,
                            }}
                        >
                            <h3>
                                <Link to={`/modules/${module.id}/lessons`}>
                                    {module.title}
                                </Link>
                            </h3>

                            <p>{module.description}</p>

                            {role === "mentor" && (
                                <div style={{ marginTop: 15 }}>

                                    <Link to={`/modules/${module.id}/edit`}>
                                        <button>Edit</button>
                                    </Link>

                                    <button
                                        onClick={() => deleteModule(module.id)}
                                        style={{
                                            marginLeft: 10,
                                            background: "#dc3545",
                                            color: "white",
                                        }}
                                    >
                                        Delete
                                    </button>

                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

export default Modules;