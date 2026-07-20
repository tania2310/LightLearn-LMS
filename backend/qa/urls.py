from rest_framework.routers import DefaultRouter
from .views import QuestionViewSet, AnswerViewSet, AIConversationViewSet

router = DefaultRouter()

router.register(r"questions", QuestionViewSet)
router.register(r"answers", AnswerViewSet)
router.register(r"ai-conversations", AIConversationViewSet, basename="ai-conversation")

urlpatterns = router.urls