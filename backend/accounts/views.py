
from email.mime.text import MIMEText
from accounts import models
from rest_framework import generics, status
from .models import User
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
)
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from django.core.mail import send_mail
from django.urls import reverse
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.conf import settings
from django.utils.http import urlsafe_base64_decode
from django.shortcuts import redirect
import random, traceback
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from django.contrib.auth.hashers import make_password
import smtplib
from email.mime.text import MIMEText

import os
import resend


GMAIL_APP_PASSWORD = "nilt fvlc tlby yyui"  # NOT your normal password
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
GMAIL_ADDRESS = "tanyawork2310@gmail.com"
from .tokens import email_verification_token

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

     
 

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = serializer.save()

            otp = str(random.randint(100000, 999999))
            user.otp = otp
            user.otp_created = timezone.now()
            user.is_email_verified = False
            user.save()

            def send_otp_email(TO_EMAIL, SUBJECT, BODY):
                try:
                    resend.api_key = os.getenv("RESEND_API_KEY")
                    resend.Emails.send({
                        "from": "onboarding@resend.dev",
                        "to": TO_EMAIL,
                        "subject": SUBJECT,
                        "text": BODY,
                    })
                    print(f"✅ Email sent to {TO_EMAIL}")
                    return True
                except Exception as e:
                    print(f"❌ Failed to send email: {e}")
                    return False




            send_otp_email(
                user.email,
                "LightLearn Email Verification",
                f"Your OTP is: {otp}",
            )

            return Response(
                {
                    "message": "Registration successful. OTP sent to mail."
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            traceback.print_exc()

            return Response(
                {
                    "error": str(e),
                    "type": type(e).__name__,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

@api_view(["POST"])
def verify_otp(request):

    email = request.data.get("email")
    otp = request.data.get("otp")

    try:
        user = User.objects.get(email=email)

        if not user.otp_created or timezone.now() > user.otp_created + timedelta(minutes=10):
            return Response(
                {"error": "OTP expired"},
                status=400
            )

        if str(user.otp).strip() != str(otp).strip():
            return Response(
                {"error": "Invalid OTP"},
                status=400
            )

        user.is_email_verified = True
        user.otp = ""
        user.save()

        return Response(
            {"message": "Email verified successfully."}
        )

    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=404
        )

@api_view(["POST"])
def forgot_password(request):
    email = request.data.get("email")

    try:
        user = User.objects.get(email=email)

        otp = str(random.randint(100000, 999999))

        user.otp = otp
        user.otp_created = timezone.now()
        user.save()

        send_mail(
            "Password Reset OTP",
            f"Your OTP is: {otp}",
            settings.EMAIL_HOST_USER,
            [email],
            fail_silently=False,
        )

        return Response({
            "message": "OTP sent."
        })

    except User.DoesNotExist:
        return Response(
            {"error": "Email not found."},
            status=404
        )

@api_view(["POST"])
def verify_reset_otp(request):
    email = request.data.get("email")
    otp = request.data.get("otp")

    try:
        user = User.objects.get(email=email)

        if user.otp != otp:
            return Response(
                {"error": "Invalid OTP"},
                status=400
            )

        if timezone.now() > user.otp_created + timedelta(minutes=10):
            return Response(
                {"error": "OTP expired"},
                status=400
            )

        return Response({
            "message": "OTP Verified"
        })

    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=404
        )

@api_view(["POST"])
def reset_password(request):
    email = request.data.get("email")
    password = request.data.get("password")

    try:
        user = User.objects.get(email=email)

        user.set_password(password)
        user.is_email_verified = True

        user.otp = ""
        user.save()

        return Response({
            "message": "Password reset successful."
        })

    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=404
        )

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


import logging
logger = logging.getLogger("accounts")

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        try:
            res = super().post(request, *args, **kwargs)
            logger.info(f"Successful login for user: {username}")
            return res
        except Exception as e:
            logger.warning(f"Failed login attempt for user: {username}. Error: {str(e)}")
            raise e


@api_view(["GET"])
@permission_classes([IsAdminUser])
def pending_mentors(request):
    mentors = User.objects.filter(
        role="mentor",
        is_approved=False
    )

    serializer = UserSerializer(mentors, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_mentor(request, user_id):
    mentor = User.objects.get(
        id=user_id,
        role="mentor"
    )

    mentor.is_approved = True
    mentor.save()

    return Response({
        "message": "Mentor approved successfully."
    })

class VerifyEmailView(APIView):
    def get(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except Exception:
            return Response({"error": "Invalid verification link."}, status=400)

        if email_verification_token.check_token(user, token):
            user.is_email_verified = True
            user.save()

            return Response({
                "message": "Email verified successfully."
            })

        return Response({
            "error": "Verification link has expired."
        }, status=400)

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_users_list(request):
    users = User.objects.all().order_by("-id")
    data = [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "role": u.role,
        "phone_number": u.phone_number,
        "is_approved": u.is_approved,
        "is_email_verified": u.is_email_verified,
        "date_joined": u.date_joined.strftime('%Y-%m-%d') if u.date_joined else None,
    } for u in users]
    return Response(data)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def reject_mentor(request, user_id):
    try:
        mentor = User.objects.get(id=user_id, role="mentor", is_approved=False)
        mentor.delete()
        return Response({"message": "Mentor rejected successfully."})
    except User.DoesNotExist:
        return Response({"error": "Mentor not found."}, status=404)