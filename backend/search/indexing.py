import logging
from .documents import CourseDocument

logger = logging.getLogger(__name__)

def index_course(course):
    try:
        if course.status == "approved":
            doc = CourseDocument()
            doc.update(course)
    except Exception as e:
        logger.warning(f"Failed to index course {course.id}: {e}")

def update_course_index(course):
    try:
        doc = CourseDocument()
        if course.status == "approved":
            doc.update(course)
        else:
            # Remove from search index if no longer approved
            doc.delete(course, ignore=404)
    except Exception as e:
        logger.warning(f"Failed to update course index {course.id}: {e}")

def delete_course_index(course):
    try:
        doc = CourseDocument()
        doc.delete(course, ignore=404)
    except Exception as e:
        logger.warning(f"Failed to delete course index {course.id}: {e}")
