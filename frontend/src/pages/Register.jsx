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
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();

        let newErrors = {};

        if (!firstName.trim())
            newErrors.first_name = "First name is required.";

        if (!lastName.trim())
            newErrors.last_name = "Last name is required.";

        if (!username.trim())
            newErrors.username = "Username is required.";

        if (!email.trim())
            newErrors.email = "Email is required.";

        if (!phoneNumber.trim())
            newErrors.phone_number = "Phone number is required.";

        if (!password.trim())
            newErrors.password = "Password is required.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);

        console.log("Sending request...");

        try {
            const response = await API.post("accounts/register/", {
                username,
                email,
                password,
                first_name: firstName,
                last_name: lastName,
                phone_number: phoneNumber,
                role,
            });

            console.log(response.data);

            alert("OTP sent to your email.");

            navigate("/verify-otp", {
                state: { email },
            });

        } catch (error) {
            console.log(error);
            setLoading(false);

            if (error.response?.data) {
                setErrors(error.response.data);
            } else {
                alert("Something went wrong.");
            }
        }

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

            alert("OTP sent to your email.");
            navigate("/verify-otp", {
                state: { email }
            });

        } catch (error) {
            setLoading(false);
            if (error.response?.data) {
                setErrors(error.response.data);
            } else {
                alert("Something went wrong.");
            }
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
                    {errors.first_name && (
                        <p className="error">{errors.first_name}</p>
                    )}

                    <input
                        type="text"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                    {errors.last_name && (
                        <p className="error">{errors.last_name}</p>
                    )}

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
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    {errors.email && (
                        <p className="error">{errors.email}</p>
                    )}

                    <input
                        type="text"
                        placeholder="Phone Number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    {errors.phone_number && (
                        <p className="error">{errors.phone_number}</p>
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

                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="student">Student</option>
                        <option value="mentor">Mentor</option>
                    </select>

                    <button type="submit" className="primary-btn" disabled={loading} style={{ width: "100%" }}>
                        {loading ? <span className="spinner-loader" style={{ width: "16px", height: "16px", borderWidth: "2px" }} /> : "Register"}
                    </button>

                </form>

            </div>
        </div>
    );
}

export default Register;