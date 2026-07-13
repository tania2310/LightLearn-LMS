import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function CourseDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [enrolled, setEnrolled] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("access");

        Promise.all([
            axios.get(`http://127.0.0.1:8000/api/courses/${id}/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }),
            axios.get("http://127.0.0.1:8000/api/enrollments/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }),
        ])
            .then(([courseResponse, enrollmentResponse]) => {
                setCourse(courseResponse.data);

                const found = enrollmentResponse.data.find(
                    (enrollment) => enrollment.course === Number(id)
                );

                setEnrolled(!!found);
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

        axios
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
                alert("Enrolled successfully!");
                setEnrolled(true);
                navigate(`/courses/${course.id}/modules`);
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
                        onClick={() =>
                            navigate(`/courses/${course.id}/modules`)
                        }
                    >
                        Go to Course
                    </button>
                ) : (
                    <button onClick={handleEnroll}>
                        Enroll
                    </button>
                )}
            </div>
        </>
    );
}

export default CourseDetails;
