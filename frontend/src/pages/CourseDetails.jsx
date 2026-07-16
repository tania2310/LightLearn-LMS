import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function CourseDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [enrolled, setEnrolled] = useState(false);

    useEffect(() => {
        Promise.all([
            API.get(`courses/${id}/`),
            API.get("enrollments/"),
        ])
            .then(([courseRes, enrollmentRes]) => {
                setCourse(courseRes.data);

                const enrollment = enrollmentRes.data.find(
                    (e) => e.course === Number(id)
                );

                if (enrollment) {
                    if (enrollment.status === "approved") {
                        setEnrolled(true);
                    } else if (enrollment.status === "pending") {
                        alert("Your enrollment is awaiting admin approval.");
                    } else if (enrollment.status === "rejected") {
                        alert("Your enrollment was rejected.");
                    }
                }
            })
            .catch((error) => {
                console.log(error);
            });
    }, [id]);

    if (!course) {
        return <p>Loading...</p>;
    }
    const handleEnroll = () => {
        const token = localStorage.getItem("access");

        API
            .post(
                "http://127.0.0.1:8000/api/enrollments/",
                {
                    course: course.id,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )
            .then(() => {
                alert("Enrollment request sent. Please wait for admin approval.");
            })
            .catch((error) => {
                console.log(error);

                if (error.response) {
                    alert(JSON.stringify(error.response.data));
                } else {
                    alert("Enrollment failed.");
                }
            });
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>{course.title}</h1>

                <p>{course.description}</p>

                <p>
                    <strong>Category:</strong> {course.category}
                </p>

                <p>
                    <strong>Price:</strong> ${course.price}
                </p>

                {enrolled ? (
                    <button
                        onClick={() => navigate(`/courses/${course.id}/modules`)}
                    >
                        Start Learning
                    </button>
                ) : (
                    <button onClick={handleEnroll}>
                        Request Enrollment
                    </button>
                )}
            </div>
        </>
    );
}

export default CourseDetails;
