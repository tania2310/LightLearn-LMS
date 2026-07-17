# LightLearn LMS — Developer Guide

This guide details code repository structure, service integrations, backend WebSocket setups, and local/cloud deployment checklists.

---

## 1. Folder Structure Overview

```text
LightLearn-LMS/
├── backend/
│   ├── accounts/         # User profile, custom obtains token views
│   ├── config/           # Django settings, ASGI routing/consumers
│   ├── courses/          # Courses metadata, modules, and lessons
│   ├── discussion/       # Channels consumers & moderated discussions
│   ├── enrollments/      # Request courses enrollments
│   ├── payments/         # Stripe/PayPal capture and webhook receivers
│   ├── qa/               # Lesson Q&A forums
│   └── reviews/          # Course rating views
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios custom instance
│   │   ├── components/   # Protected routes, layout navbar
│   │   └── pages/        # Dashboard, CourseDetails, Checkout pages
│   ├── index.html        # SPA template page
│   └── vite.config.js    # Client dev server configuration
```

---

## 2. Environment Variables

Create `.env` inside `/backend` following `.env.example`:
- `SECRET_KEY`: Standard Django crypt key.
- `DEBUG`: Controls development debug flags (set to `False` in production).
- `ALLOWED_HOSTS`: Comma-separated list of hostnames.
- `DATABASE_URL`: Cloud PostgreSQL connection URI.
- `REDIS_URL`: Redis URI used as Channel Layer broker.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `VITE_STRIPE_PUBLIC_KEY`
- `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET`

Create `.env` inside `/frontend` following `.env.example`:
- `VITE_API_URL`: Root path of the backend REST endpoints.
- `VITE_WS_URL`: Root path of the WebSocket ASGI Daphne service.
- `VITE_STRIPE_PUBLIC_KEY`: Stripe card token gateway key.

---

## 3. WebSocket Consumer Configuration

Real-time student chat uses Django Channels backed by Daphne and a Redis Channel Layer.
- **Routing**: Routed inside `backend/discussion/routing.py` mapping path `ws/chat/<course_id>/` to `ChatConsumer`.
- **Consumer Logic**: Handles JSON parsing of incoming payloads. Authenticated clients publish message payloads to the channel layer group `chat_<course_id>`.
- **Lock Check**: Validates `ChatRoom.is_locked` database flag at both WebSocket consumer level and HTTP message creations to block incoming chat inputs immediately.

---

## 4. Redis Config

In `settings.py`, the ASGI channels layers use:
```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.getenv("REDIS_URL", "redis://127.0.0.1:6379")],
        },
    },
}
```

---

## 5. Docker Integration

- **Dockerfile**: Implements multi-stage Python setup running `gunicorn --bind 0.0.0.0:8000 config.wsgi:application`.
- **Docker Compose**: Spins up Daphne, PostgreSQL, and Redis containers. To launch:
  ```bash
  docker-compose up --build
  ```

---

## 6. Cloud Deployment Instructions

### Backend (Railway/Render/AWS)
1. Provision a PostgreSQL DB and a Redis instance (e.g. Neon, Upstash).
2. Configure environment variables in host provider dashboard.
3. Deploy Django repo. Build command:
   ```bash
   python -m pip install -r requirements.txt
   python manage.py collectstatic --noinput
   python manage.py migrate
   ```
4. Run ASGI/WSGI web command:
   ```bash
   gunicorn config.wsgi:application
   ```

### Frontend (Vercel/Netlify)
1. Configure environment variables (`VITE_API_URL`, `VITE_WS_URL`, `VITE_STRIPE_PUBLIC_KEY`).
2. Build command:
   ```bash
   npm run build
   ```
3. Set output publish directory to `dist/`.
