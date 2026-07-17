from accounts import views
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    ProfileView,
    CustomTokenObtainPairView,
    pending_mentors,
    approve_mentor,
    admin_users_list,
    reject_mentor,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),

    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("pending-mentors/", pending_mentors),
    path("approve-mentor/<int:user_id>/", approve_mentor),
    path("reject-mentor/<int:user_id>/", reject_mentor),
    path("admin/users/", admin_users_list),
    path("verify-otp/",views.verify_otp,name="verify-otp",),
    path("forgot-password/", views.forgot_password, name="forgot-password"),
    path("verify-reset-otp/", views.verify_reset_otp, name="verify-reset-otp"),
    path("reset-password/", views.reset_password, name="reset-password"),
]
