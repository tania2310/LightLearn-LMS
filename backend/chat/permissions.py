from courses.models import Enrollment

def has_chat_access(user, course):
    """
    Checks if a user has access permission to a course chat.
    Admins / Staff: Yes
    Mentors: Only if they own the course
    Students: Only if they have an approved enrollment AND paid payment (or free course)
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.role == "admin":
        return True
    elif user.role == "mentor":
        return course.mentor == user
    elif user.role == "student":
        if course.price <= 0:
            return Enrollment.objects.filter(student=user, course=course, status="approved").exists()
        return Enrollment.objects.filter(student=user, course=course, status="approved", payments__status="Paid").exists()
    return False
