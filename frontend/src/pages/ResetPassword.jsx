import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/api";

function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email;

    const handleReset = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            alert("Password must be at least 8 characters.");
            return;
        }

        try {
            await API.post("accounts/reset-password/", {
                email,
                password,
            });

            alert("Password changed successfully.");

            navigate("/");

        } catch (error) {
            alert(
                error.response?.data?.error ||
                "Something went wrong."
            );
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">

                <h2>Reset Password</h2>

                <form onSubmit={handleReset}>

                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) =>
                            setConfirmPassword(e.target.value)
                        }
                    />

                    <button type="submit">
                        Reset Password
                    </button>

                </form>

            </div>
        </div>
    );
}

export default ResetPassword;