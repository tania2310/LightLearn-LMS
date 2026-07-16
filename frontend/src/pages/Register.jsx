import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../api/api";
import "../styles/Register.css";

function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    const [role, setRole] = useState(
        searchParams.get("role") || "student"
    );

    const handleRegister = async (e) => {
        e.preventDefault();

        try {
            await API.post("accounts/register/", {
                username,
                email,
                password,
                first_name: firstName,
                last_name: lastName,
                phone_number: phoneNumber,
                role,
            });

            alert("Registration Successful!");
            navigate("/");
        } catch (err) {
            console.log(err);
            alert("Registration Failed");
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">

                <h1>Create Account</h1>

                <form onSubmit={handleRegister}>

                    <input
                        type="text"
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />

                    <input
                        type="text"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />

                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        type="text"
                        placeholder="Phone Number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="student">Student</option>
                        <option value="mentor">Mentor</option>
                    </select>

                    <button type="submit">
                        Register
                    </button>

                </form>

            </div>
        </div>
    );
}

export default Register;