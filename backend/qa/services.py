import os
import logging
import requests

logger = logging.getLogger(__name__)

def generate_ai_response(student, lesson, question, history_messages=None):
    """
    Generate an AI response based on the course, module, lesson, question, and chat history.
    Communicates with OpenAI API (gpt-4o-mini).
    Falls back gracefully if the API key is missing or calls fail.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key or openai_key == "your_openai_api_key_here":
        logger.warning("OPENAI_API_KEY is not set or has placeholder value.")
        return "The AI assistant is temporarily unavailable. Your question was saved. Please try again later.", "simulated", 0

    course_title = lesson.module.course.title if lesson.module and lesson.module.course else "Unknown Course"
    module_title = lesson.module.title if lesson.module else "Unknown Module"
    lesson_title = lesson.title
    lesson_description = lesson.description if hasattr(lesson, "description") and lesson.description else ""

    # 1. Build system instructions
    system_prompt = (
        f"You are the LightLearn AI assistant.\n\n"
        f"Course:\n{course_title}\n\n"
        f"Lesson:\n{lesson_title}\n"
        f"Description: {lesson_description}\n\n"
        f"Answer the student's question only using the lesson context or related course topics. "
        f"If the answer isn't related to this lesson, politely tell the student.\n"
        f"Answer only as plain text. Do not use any markdown formatting, HTML tags, or bold/italic markers."
    )

    # 2. Build conversation messages history list
    messages = [
        {"role": "system", "content": system_prompt}
    ]

    # Prepend up to 10 latest history messages
    if history_messages:
        latest_history = list(history_messages)[-10:]
        for msg in latest_history:
            role = "user" if msg.sender == "user" else "assistant"
            messages.append({"role": role, "content": msg.message})

    # Append current question
    messages.append({"role": "user", "content": question})

    # 3. Call OpenAI API Chat completions
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {openai_key}"
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 500
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=12)
        if response.status_code == 200:
            data = response.json()
            answer = data["choices"][0]["message"]["content"].strip()
            tokens = data.get("usage", {}).get("total_tokens", 0)
            return answer, "gpt-4o-mini", tokens
        else:
            logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
            return "The AI assistant is temporarily unavailable. Your question was saved. Please try again later.", "error", 0
    except Exception as e:
        logger.exception("Exception occurred while calling OpenAI API:")
        return "The AI assistant is temporarily unavailable. Your question was saved. Please try again later.", "error", 0
