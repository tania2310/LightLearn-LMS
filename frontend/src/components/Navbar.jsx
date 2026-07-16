import { Link, useNavigate } from "react-router-dom";
import "../styles/navbar.css";

function Navbar() {
    const navigate = useNavigate();

    const role = localStorage.getItem("role");

    const username = localStorage.getItem("username") || "User";

    const logout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("role");
        localStorage.removeItem("username");

        navigate("/");
    };

    return (
        <nav className="navbar">

            <div className="logo">
                🎓 LearnHub
            </div>
            <div className="nav-links">

                {role === "student" && (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/courses">Courses</Link>
                        <Link to="/progress">My Progress</Link>
                    </>
                )}

                {role === "mentor" && (
                    <>
                        <Link to="/mentor">Dashboard</Link>
                        <Link to="/mentor/create-course">
                            Create Course
                        </Link>
                    </>
                )}

                {role === "admin" && (
                    <>
                        <Link to="/admin">Dashboard</Link>

                        <Link to="/admin/pending-mentors">
                            Mentor Approvals
                        </Link>
                        <Link to="/admin/enrollments">
                            <button>Pending Enrollments</button>
                        </Link>
                    </>
                )}
            </div>

            <div className="user-section">

                <div className="avatar">
                    {username.charAt(0).toUpperCase()}
                </div>

                <span className={`badge ${role}`}>
                    {role}
                </span>

                <button
                    className="logout-btn"
                    onClick={logout}
                >
                    Logout
                </button>

            </div>

        </nav>
    );
}

export default Navbar;