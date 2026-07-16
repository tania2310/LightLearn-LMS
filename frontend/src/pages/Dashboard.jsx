import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import "../styles/dashboard.css";

function Dashboard() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        API.get("accounts/profile/")
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

            <div className="dashboard-container">
                {user && (
                    <>
                        <div className="welcome-card">
                            <h1>Welcome, {user.username} 👋</h1>

                            <p>Email: {user.email}</p>

                            <p>Role: {user.role}</p>

                            <Link to="/courses">
                                <button className="primary-btn">
                                    Browse Courses
                                </button>
                            </Link>
                        </div>

                        <div className="stats-grid">
                            <div className="stat-card">
                                <h2>📚</h2>
                                <h3>Courses</h3>
                                <p>Coming Soon</p>
                            </div>

                            <div className="stat-card">
                                <h2>✅</h2>
                                <h3>Progress</h3>
                                <p>Coming Soon</p>
                            </div>

                            <div className="stat-card">
                                <h2>🏆</h2>
                                <h3>Certificates</h3>
                                <p>Coming Soon</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default Dashboard;