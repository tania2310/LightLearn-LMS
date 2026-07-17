import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await API.post("accounts/forgot-password/", {
                email,
            });

            alert("OTP sent to your email.");

            navigate("/verify-reset-otp", {
                state: { email },
            });

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

                <h2>Forgot Password</h2>

                <form onSubmit={handleSubmit}>

                    <input
                        type="email"
                        placeholder="Enter Email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                    />

                    <button type="submit">
                        Send OTP
                    </button>

                </form>

            </div>
        </div>
    );
}

export default ForgotPassword;