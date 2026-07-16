from rest_framework import generics
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


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


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