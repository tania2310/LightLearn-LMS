from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "phone_number",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)

        if user.role == "student":
            user.is_approved = True
        else:
            user.is_approved = False

        user.set_password(password)
        user.save() 

        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone_number",
        ]

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)

        # Block unapproved mentors
        if self.user.role == "mentor" and not self.user.is_approved:
            raise AuthenticationFailed(
                "Your mentor account is awaiting admin approval."
            )

        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "role": self.user.role,
        }

        return data