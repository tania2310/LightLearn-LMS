import logging
from django.core.mail import send_mail
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from accounts.models import User
from .models import Notification
from .serializers import NotificationSerializer

logger = logging.getLogger(__name__)

def notify_user(recipient, title, message, notification_type, target_url="", metadata=None):
    if metadata is None:
        metadata = {}

    # 1. Create and save notification in Database
    notification = Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        target_url=target_url,
        metadata=metadata
    )

    # 2. Push real-time WebSocket notification (best-effort)
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            serializer = NotificationSerializer(notification)
            async_to_sync(channel_layer.group_send)(
                f"notifications_{recipient.id}",
                {
                    "type": "send_notification",
                    "data": serializer.data
                }
            )
    except Exception as e:
        logger.warning(f"Failed to dispatch WebSocket notification to user {recipient.id}: {e}")

    # 3. Attempt to send Email (fail-safe)
    try:
        send_mail(
            subject=title,
            message=message,
            from_email=None,
            recipient_list=[recipient.email],
            fail_silently=False
        )
    except Exception as e:
        logger.error(f"Failed to send email notification to {recipient.email}: {e}")

    return notification

def send_enrollment_notification(enrollment):
    if enrollment.status == "approved":
        course_name = enrollment.course.title
        notify_user(
            recipient=enrollment.student,
            title="Enrollment Approved",
            message=f"You have been enrolled in {course_name}.",
            notification_type="Enrollment",
            target_url="/dashboard",
            metadata={"course_id": enrollment.course.id}
        )

def send_new_lesson_notification(lesson):
    course = lesson.module.course
    # Get all approved enrollments
    enrollments = course.enrollments.filter(status="approved")
    for enrollment in enrollments:
        notify_user(
            recipient=enrollment.student,
            title="New Lesson Available",
            message=f"New lesson available: Lesson: {lesson.title}",
            notification_type="Lesson",
            target_url=f"/courses/{course.id}/modules",
            metadata={"course_id": course.id, "lesson_id": lesson.id}
        )

def send_qa_answered_notification(question):
    # Notify the question poster
    notify_user(
        recipient=question.student,
        title="Your Q&A Question Answered",
        message="Your question has been answered.",
        notification_type="QA",
        target_url="/qa",
        metadata={"question_id": question.id}
    )

def send_refund_notification(refund_request):
    notify_user(
        recipient=refund_request.student,
        title=f"Refund Request {refund_request.status}",
        message=f"Your refund request has been {refund_request.status.lower()}.",
        notification_type="Refund",
        target_url="/payment-history",
        metadata={"enrollment_id": refund_request.enrollment.id}
    )

def send_course_announcement(course, title, message):
    enrollments = course.enrollments.filter(status="approved")
    for enrollment in enrollments:
        notify_user(
            recipient=enrollment.student,
            title="Course Announcement",
            message=message,
            notification_type="Announcement",
            target_url=f"/courses/{course.id}",
            metadata={"course_id": course.id}
        )
