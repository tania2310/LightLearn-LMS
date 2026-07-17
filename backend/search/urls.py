from django.urls import path
from .views import CourseSearchView, MentorSearchView, AutocompleteView

urlpatterns = [
    path("courses/", CourseSearchView.as_view(), name="search-courses"),
    path("mentors/", MentorSearchView.as_view(), name="search-mentors"),
    path("autocomplete/", AutocompleteView.as_view(), name="search-autocomplete"),
]
