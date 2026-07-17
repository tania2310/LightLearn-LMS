import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from courses.models import Course
from accounts.models import User
from courses.serializers import CourseSerializer
from accounts.serializers import UserSerializer
from .documents import CourseDocument, MentorDocument
from .filters import apply_filters_es, apply_filters_orm

logger = logging.getLogger(__name__)

class CourseSearchView(APIView):
    def get(self, request):
        q = request.query_params.get("q", "")
        ordering = request.query_params.get("ordering", "")

        try:
            # 1. Try search with Elasticsearch
            search_obj = CourseDocument.search()
            if q:
                search_obj = search_obj.query(
                    "multi_match",
                    query=q,
                    fields=["title^3", "description", "category", "tags", "mentor_name", "mentor_expertise"]
                )

            # Apply Elasticsearch filtering
            search_obj = apply_filters_es(search_obj, request.query_params)

            # Apply Elasticsearch ordering/sorting
            if ordering:
                sort_field = ordering
                # Map DRF style ordering to Elasticsearch
                if sort_field.startswith("-"):
                    field = sort_field[1:]
                    if field == "rating":
                        field = "average_rating"
                    search_obj = search_obj.sort(f"-{field}")
                else:
                    field = sort_field
                    if field == "rating":
                        field = "average_rating"
                    search_obj = search_obj.sort(field)

            # Execute search
            response = search_obj.execute()
            course_ids = [hit.id for hit in response]

            # Preserve search ranking score order
            courses = list(Course.objects.filter(id__in=course_ids))
            courses.sort(key=lambda c: course_ids.index(c.id))

            serializer = CourseSerializer(courses, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.warning(f"Elasticsearch search failed, falling back to ORM: {e}")
            # 2. Database Fallback
            queryset = Course.objects.filter(status="approved")
            if q:
                queryset = queryset.filter(
                    Q(title__icontains=q) |
                    Q(description__icontains=q) |
                    Q(category__icontains=q) |
                    Q(tags__icontains=q) |
                    Q(mentor__username__icontains=q)
                )

            # Apply ORM filters
            queryset = apply_filters_orm(queryset, request.query_params)

            # Apply ORM ordering
            if ordering:
                # Map rating order keyword to average_rating column
                if ordering == "rating":
                    queryset = queryset.order_by("average_rating")
                elif ordering == "-rating":
                    queryset = queryset.order_by("-average_rating")
                else:
                    queryset = queryset.order_by(ordering)

            serializer = CourseSerializer(queryset.distinct(), many=True)
            return Response(serializer.data)


class MentorSearchView(APIView):
    def get(self, request):
        q = request.query_params.get("q", "")

        try:
            # Try Elasticsearch
            search_obj = MentorDocument.search()
            if q:
                search_obj = search_obj.query(
                    "multi_match",
                    query=q,
                    fields=["username^3", "biography", "expertise"]
                )
            
            response = search_obj.execute()
            mentor_ids = [hit.id for hit in response]

            mentors = list(User.objects.filter(id__in=mentor_ids, role="mentor", is_approved=True))
            mentors.sort(key=lambda m: mentor_ids.index(m.id))

            serializer = UserSerializer(mentors, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.warning(f"Elasticsearch mentor search failed, falling back to ORM: {e}")
            # Fallback to ORM
            queryset = User.objects.filter(role="mentor", is_approved=True)
            if q:
                queryset = queryset.filter(
                    Q(username__icontains=q) |
                    Q(biography__icontains=q) |
                    Q(expertise__icontains=q)
                )
            serializer = UserSerializer(queryset.distinct(), many=True)
            return Response(serializer.data)


class AutocompleteView(APIView):
    def get(self, request):
        q = request.query_params.get("q", "")
        if not q:
            return Response({"courses": [], "mentors": [], "categories": [], "tags": []})

        try:
            # Try Elasticsearch autocomplete query
            course_search = CourseDocument.search().query("match_phrase_prefix", title=q)
            mentor_search = MentorDocument.search().query("match_phrase_prefix", username=q)

            courses_response = course_search.execute()
            mentors_response = mentor_search.execute()

            courses_list = [{"id": hit.id, "title": hit.title} for hit in courses_response]
            mentors_list = [{"id": hit.id, "username": hit.username} for hit in mentors_response]

            # Collect unique categories/tags matching phrase prefix
            categories = list(set([hit.category for hit in courses_response if hasattr(hit, "category")]))
            tags = []
            for hit in courses_response:
                if hasattr(hit, "tags") and hit.tags:
                    for tag in str(hit.tags).split():
                        if q.lower() in tag.lower() and tag not in tags:
                            tags.append(tag)

            return Response({
                "courses": courses_list[:5],
                "mentors": mentors_list[:5],
                "categories": categories[:5],
                "tags": tags[:5]
            })

        except Exception as e:
            logger.warning(f"Elasticsearch autocomplete failed, falling back to ORM: {e}")
            # Database Fallback
            matched_courses = Course.objects.filter(status="approved", title__icontains=q)[:5]
            matched_mentors = User.objects.filter(role="mentor", is_approved=True, username__icontains=q)[:5]

            courses_list = [{"id": c.id, "title": c.title} for c in matched_courses]
            mentors_list = [{"id": m.id, "username": m.username} for m in matched_mentors]

            # Extrapolate categories and tags
            categories = list(Course.objects.filter(status="approved", category__icontains=q).values_list("category", flat=True).distinct())[:5]
            
            tags = []
            courses_with_tags = Course.objects.filter(status="approved").exclude(tags="")
            for course in courses_with_tags:
                course_tags = str(course.tags or "").split()
                for tag in course_tags:
                    if q.lower() in tag.lower() and tag not in tags:
                        tags.append(tag)

            return Response({
                "courses": courses_list,
                "mentors": mentors_list,
                "categories": categories,
                "tags": tags[:5]
            })
