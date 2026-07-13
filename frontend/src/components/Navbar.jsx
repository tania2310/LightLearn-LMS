import { Link, useNavigate } from "react-router-dom";

function Navbar() {
    const navigate = useNavigate();

    const logout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/");
    };

    return (
        <nav
            style={{
                padding: "15px",
                background: "#1e293b",
                color: "white",
                display: "flex",
                gap: "20px",
            }}
        >
            <Link to="/dashboard" style={{ color: "white" }}>
                Dashboard
            </Link>

            <Link to="/courses" style={{ color: "white" }}>
                Courses
            </Link>

            <button onClick={logout}>Logout</button>
        </nav>
    );
}

export default Navbar;