import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/api";

function VerifyOTP() {
    const location = useLocation();
    const navigate = useNavigate();

    const [email, setEmail] = useState(location.state?.email || "");
    const [otp, setOtp] = useState("");

    const handleVerify = async (e) => {
        e.preventDefault();

        try {
            const res = await API.post("accounts/verify-otp/", {
                email,
                otp,
            });

            alert(res.data.message || "OTP Verified Successfully!");

            navigate("/");
        } catch (error) {

            if (error.response?.data?.error) {
                alert(error.response.data.error);
            } else {
                alert("Invalid OTP.");
            }

        }
    };

    return (
        <div className="login-page">

            <div className="login-card">

                <h2>Verify OTP</h2>

                <form onSubmit={handleVerify}>

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

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

export default VerifyOTP;