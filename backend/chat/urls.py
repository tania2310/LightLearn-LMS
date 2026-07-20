from django.urls import path
from .views import ChatHistoryView, FileUploadView, ChatStatisticsView, ChatExportCSVView

urlpatterns = [
    path("history/<int:course_id>/", ChatHistoryView.as_view(), name="chat_history"),
    path("upload/<int:course_id>/", FileUploadView.as_view(), name="chat_upload"),
    path("statistics/<int:course_id>/", ChatStatisticsView.as_view(), name="chat_statistics"),
    path("export/<int:course_id>/", ChatExportCSVView.as_view(), name="chat_export"),
]
