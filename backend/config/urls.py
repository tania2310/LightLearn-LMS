from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/", include("courses.urls")),
    path("api/", include("qa.urls")),
    path("api/discussion/", include("discussion.urls")),
    path("api/", include("payments.urls")),
    path("api/", include("notifications.urls")),
    path("api/search/", include("search.urls")),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)