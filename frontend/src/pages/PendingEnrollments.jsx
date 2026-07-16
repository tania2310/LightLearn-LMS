import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";

function PendingEnrollments() {
    const [enrollments, setEnrollments] = useState([]);

    useEffect(() => {
        API.get("enrollments/")
            .then((response) => {
                const pending = response.data.filter(
                    (e) => e.status === "pending"
                );

                setEnrollments(pending);
            })
            .catch(console.log);
    }, []);

    const approveEnrollment = (id) => {
        API.post(`enrollments/approve/${id}/`)
            .then(() => {
                alert("Enrollment Approved!");

                setEnrollments((prev) =>
                    prev.filter((e) => e.id !== id)
                );
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>Pending Enrollments</h1>

                {enrollments.length === 0 ? (
                    <p>No pending enrollments.</p>
                ) : (
                    enrollments.map((enrollment) => (
                        <div
                            key={enrollment.id}
                            style={{
                                border: "1px solid #ccc",
                                padding: "20px",
                                marginBottom: "15px",
                                borderRadius: "10px",
                            }}
                        >
                            <p>
                                <strong>Student ID:</strong>{" "}
                                {enrollment.student}
                            </p>

                            <p>
                                <strong>Course ID:</strong>{" "}
                                {enrollment.course}
                            </p>

                            <p>
                                <strong>Status:</strong>{" "}
                                {enrollment.status}
                            </p>

                            <button
                                onClick={() =>
                                    approveEnrollment(enrollment.id)
                                }
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

export default PendingEnrollments;