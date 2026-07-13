import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

function Dashboard() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("access");

        axios
            .get("http://127.0.0.1:8000/api/accounts/profile/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setUser(response.data);
            })
            .catch((error) => {
                console.log(error);
            });
    }, []);

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px" }}>
                <h1>LightLearn LMS</h1>

                {user ? (
                    <>
                        <h2>Welcome, {user.username}!</h2>

                        <p>Email: {user.email}</p>
                        <p>Role: {user.role}</p>
                    </>
                ) : (
                    <p>Loading profile...</p>
                )}
            </div>
        </>
    );
}

export default Dashboard;