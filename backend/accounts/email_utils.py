import os
import requests

BREVO_API_KEY = os.getenv("BREVO_API_KEY")

def send_otp_email(email, otp):
    url = "https://api.brevo.com/v3/smtp/email"

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }

    payload = {
        "sender": {
            "name": "LightLearn",
            "email": "tanianirmal17498@gmail.com"
        },
        "to": [
            {
                "email": email
            }
        ],
        "subject": "LightLearn Email Verification",
        "htmlContent": f"""
        <h2>LightLearn</h2>
        <p>Your OTP is:</p>
        <h1>{otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
        """
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code not in (200, 201):
        raise Exception(response.text)