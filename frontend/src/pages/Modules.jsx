import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

function Modules() {
    const { id } = useParams();

    const [modules, setModules] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("access");

        API
            .get("http://127.0.0.1:8000/api/modules/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
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

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>Modules</h1>

                {modules.length === 0 ? (
                    <p>No modules yet.</p>
                ) : (
                    modules.map((module) => (
                        <div key={module.id}>
                            <h3>
                                <Link to={`/modules/${module.id}/lessons`}>
                                    {module.title}
                                </Link>
                            </h3>
                            <p>{module.description}</p>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

export default Modules;