import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";

function PendingMentors() {
    const [mentors, setMentors] = useState([]);

    useEffect(() => {
        API.get("accounts/pending-mentors/")
            .then((res) => {
                setMentors(res.data);
            })
            .catch(console.log);
    }, []);

    const approveMentor = (id) => {
        API.post(`accounts/approve-mentor/${id}/`)
            .then(() => {
                alert("Mentor Approved!");

                setMentors((prev) =>
                    prev.filter((mentor) => mentor.id !== id)
                );
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>Pending Mentor Approvals</h1>

                {mentors.length === 0 ? (
                    <p>No pending mentors.</p>
                ) : (
                    mentors.map((mentor) => (
                        <div
                            key={mentor.id}
                            style={{
                                border: "1px solid #ddd",
                                padding: "20px",
                                marginBottom: "15px",
                                borderRadius: "10px",
                            }}
                        >
                            <h3>{mentor.username}</h3>

                            <p>{mentor.email}</p>

                            <button
                                onClick={() => approveMentor(mentor.id)}
                            >
                                Approve
                            </button>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

export default PendingMentors;