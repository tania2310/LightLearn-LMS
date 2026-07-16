import { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [portal, setPortal] = useState("student");

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await API.post("accounts/login/", {
                username,
                password,
            });

            const role = response.data.user.role;

            if (role !== portal) {
                alert(`This account belongs to the ${role} portal.`);
                return;
            }

            localStorage.setItem("access", response.data.access);
            localStorage.setItem("refresh", response.data.refresh);
            localStorage.setItem("role", role);
            localStorage.setItem("username", username);

            switch (role) {
                case "student":
                    navigate("/dashboard");
                    break;

                case "mentor":
                    navigate("/mentor");
                    break;

                case "admin":
                    navigate("/admin");
                    break;

                default:
                    alert("Unknown user role.");
            }
        } catch (error) {
            console.error(error);
            alert("Invalid Credentials");
        }
    };

    return (
        <div className="login-page">

            <div className="login-card">

                <h1>LMS Portal</h1>

                <div className="portal-buttons">

                    <button
                        type="button"
                        className={portal === "student" ? "active" : ""}
                        onClick={() => setPortal("student")}
                    >
                        Student
                    </button>

                    <button
                        type="button"
                        className={portal === "mentor" ? "active" : ""}
                        onClick={() => setPortal("mentor")}
                    >
                        Mentor
                    </button>

                    <button
                        type="button"
                        className={portal === "admin" ? "active" : ""}
                        onClick={() => setPortal("admin")}
                    >
                        Admin
                    </button>

                </div>

                <form className="login-form" onSubmit={handleLogin}>

                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button type="submit">
                        Login
                    </button>

                </form>

                {portal !== "admin" && (

                    <button
                        className="register-btn"
                        onClick={() => navigate(`/register?role=${portal}`)}
                    >
                        Create {portal} Account
                    </button>

                )}

            </div>

        </div>
    );
}

export default Login;