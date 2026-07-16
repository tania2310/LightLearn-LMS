import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";

function StudentProgress() {
    const [progress, setProgress] = useState([]);

    useEffect(() => {
        API.get("progress/")
            .then((res) => setProgress(res.data))
            .catch(console.log);
    }, []);

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>My Progress</h1>

                {progress.length === 0 ? (
                    <p>No lessons completed yet.</p>
                ) : (
                    progress.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                border: "1px solid #ddd",
                                padding: "15px",
                                marginBottom: "10px",
                                borderRadius: "8px",
                            }}
                        >
                            Lesson ID: {item.lesson} <br />
                            Status: {item.completed ? "✅ Completed" : "❌ Pending"}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

export default StudentProgress;