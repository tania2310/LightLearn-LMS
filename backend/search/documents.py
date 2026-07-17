from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry
from elasticsearch_dsl import analyzer, token_filter
from courses.models import Course
from accounts.models import User

# Define the synonym token filter and analyzer
synonym_filter = token_filter(
    "synonym_filter",
    type="synonym",
    synonyms=[
        "js, javascript",
        "ai, artificial intelligence",
        "ml, machine learning",
    ]
)

synonym_analyzer = analyzer(
    "synonym_analyzer",
    tokenizer="standard",
    filter=["lowercase", synonym_filter]
)

@registry.register_document
class CourseDocument(Document):
    # Custom fields mapping
    mentor_name = fields.TextField()
    mentor_expertise = fields.TextField()

    title = fields.TextField(analyzer=synonym_analyzer)
    description = fields.TextField(analyzer=synonym_analyzer)
    category = fields.KeywordField()
    language = fields.KeywordField()
    level = fields.KeywordField()
    duration = fields.IntegerField()
    price = fields.DoubleField()
    status = fields.KeywordField()
    average_rating = fields.DoubleField()
    tags = fields.TextField(analyzer=synonym_analyzer)

    class Index:
        name = "courses"
        settings = {"number_of_shards": 1, "number_of_replicas": 0}

    class Django:
        model = Course
        fields = [
            "id",
            "created_at",
        ]

    def get_queryset(self):
        # Only index approved/public courses
        return super().get_queryset().filter(status="approved")

    def prepare_mentor_name(self, instance):
        if instance.mentor:
            return instance.mentor.username
        return ""

    def prepare_mentor_expertise(self, instance):
        if instance.mentor and hasattr(instance.mentor, "expertise"):
            return instance.mentor.expertise
        return ""

    def prepare_tags(self, instance):
        # If the course has tags defined as a list or string, handle accordingly
        # Let's see: Course model might have tags field. Let's assume it is a string or list
        if hasattr(instance, "tags"):
            if isinstance(instance.tags, list):
                return " ".join(instance.tags)
            return str(instance.tags or "")
        return ""


@registry.register_document
class MentorDocument(Document):
    biography = fields.TextField()
    expertise = fields.TextField()

    class Index:
        name = "mentors"
        settings = {"number_of_shards": 1, "number_of_replicas": 0}

    class Django:
        model = User
        fields = [
            "id",
            "username",
        ]

    def get_queryset(self):
        # Only index approved mentors
        return super().get_queryset().filter(role="mentor", is_approved=True)

    def prepare_biography(self, instance):
        if hasattr(instance, "biography"):
            return str(instance.biography or "")
        return ""

    def prepare_expertise(self, instance):
        if hasattr(instance, "expertise"):
            return str(instance.expertise or "")
        return ""
