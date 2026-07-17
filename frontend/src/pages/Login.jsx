import { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [portal, setPortal] = useState("student");
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        let newErrors = {};

        if (!username.trim())
            newErrors.username = "Username is required.";

        if (!password.trim())
            newErrors.password = "Password is required.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);

        try {
            const response = await API.post("accounts/login/", {
                username,
                password,
            });

            const role = response.data.user.role;

            if (role !== portal) {
                setErrors({
                    general: `This account belongs to the ${role} portal.`,
                });
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
                    setErrors({
                        general: "Unknown user role.",
                    });
            }

        } catch (error) {

            if (error.response?.data) {

                if (error.response.data.detail) {

                    setErrors({
                        general: error.response.data.detail,
                    });

                } else {

                    setErrors(error.response.data);

                }

            } else {

                setErrors({
                    general: "Unable to connect to the server.",
                });

            }
        } finally {
            setLoading(false);
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
                    {errors.username && (
                        <p className="error">{errors.username}</p>
                    )}

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {errors.password && (
                        <p className="error">{errors.password}</p>
                    )}
                     {errors.general && (
                        <div className="error-alert-banner">{errors.general}</div>
                     )}

                     <button type="submit" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", width: "100%" }}>
                         {loading ? <span className="spinner-loader" style={{ width: "16px", height: "16px", borderWidth: "2px" }} /> : "Login"}
                     </button>
                    <p
                        style={{
                            cursor: "pointer",
                            color: "blue",
                            marginTop: "10px"
                        }}
                        onClick={() => navigate("/forgot-password")}
                    >
                        Forgot Password?
                    </p>


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