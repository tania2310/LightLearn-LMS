import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

function Courses() {
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        API
            .get("courses/")
            .then((response) => {
                console.log(response.data);
                setCourses(response.data);
            })
            .catch((error) => {
                console.log(error);
            });
    }, []);

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>Courses</h1>

                {courses.length === 0 ? (
                    <p>No courses available.</p>
                ) : (
                    courses.map((course) => (
                        <div
                            key={course.id}
                            style={{
                                border: "1px solid gray",
                                padding: "20px",
                                marginBottom: "20px",
                                borderRadius: "8px",
                            }}
                        >
                            <h2>
                                <Link to={`/courses/${course.id}`}>
                                    {course.title}
                                </Link>
                            </h2>

                            <p>{course.description}</p>

                            <p>
                                <strong>Category:</strong> {course.category}
                            </p>

                            <p>
                                <strong>Price:</strong> ${course.price}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

export default Courses;