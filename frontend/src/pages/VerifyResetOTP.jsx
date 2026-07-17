import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/api";

function VerifyResetOTP() {
    const [otp, setOtp] = useState("");

    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email;

    const handleVerify = async (e) => {
        e.preventDefault();

        try {
            await API.post("accounts/verify-reset-otp/", {
                email,
                otp,
            });

            alert("OTP Verified");

            navigate("/reset-password", {
                state: { email },
            });

        } catch (error) {
            alert(
                error.response?.data?.error ||
                "Invalid OTP"
            );
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">

                <h2>Verify OTP</h2>

                <form onSubmit={handleVerify}>

                    <input
                        type="text"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                    />

                    <button type="submit">
                        Verify OTP
                    </button>

                </form>

            </div>
        </div>
    );
}

export default VerifyResetOTP;