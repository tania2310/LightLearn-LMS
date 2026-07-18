# LightLearn LMS (Learning Management System)

A state-of-the-art, feature-rich Learning Management System designed to bridge students, mentors, and administrators. This application supports course catalog browsing, video/text lesson learning, progress checklists, real-time classroom locking discussions, automatic certificates generation, and PayPal secure checkouts.

## Technology Stack

- **Backend**: Django 6.0, Django REST Framework (DRF), Channels (WebSockets + Redis), SimpleJWT authentication.
- **Frontend**: React 18, Vite, Vanilla CSS.
- **Server/Proxy**: Daphne, Gunicorn, WhiteNoise (production static assets).
- **Database**: PostgreSQL (fallback SQLite for local development).
- **Broker/Cache**: Redis (WebSocket Channel Layer).

---

## Folder Structure

```text
LightLearn-LMS/
├── backend/
│   ├── accounts/         # User auth, email verification, and profile management
│   ├── config/           # Core settings.py, urls.py, routing/consumers
│   ├── courses/          # Courses metadata, modules, and lessons CRUD
│   ├── discussion/       # WebSocket chat consumers & moderated discussion rooms
│   ├── enrollments/      # Course enrollment management
│   ├── payments/         # PayPal transactions & refund handling
│   ├── qa/               # Lesson Q&A forums
│   └── reviews/          # Course ratings and student feedback
└── frontend/
    ├── src/
    │   ├── api/          # Axios configurations referencing environment variables
    │   ├── components/   # Shared layout controls & navigation bars
    │   └── pages/        # Dashboard, Course details, checkout, and chats pages
```

---

## Core Features

- **Authentication & Security**: Multi-role signup (Student/Mentor), OTP code generation, JWT authorization tokens, and admin approvals.
- **Interactive Discussion Rooms**: Real-time room locked discussions, student-specific inputs, and moderator delete actions.
- **Payments & Webhooks**: Integrated payment checkout sessions utilizing PayPal Sandbox captures.
- **Administrative Moderation**: Verification controls for course approval, refund request revokes, and mentor registrations.

---

## Installation & Local Development

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ or 20+
- Redis server (local or Docker instance)

### 2. Backend Setup
1. Navigate to `/backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv .venv
   # Windows
   .\.venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and fill in secrets:
   ```bash
   cp .env.example .env
   ```
5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```
6. Start development ASGI server:
   ```bash
   python manage.py runserver
   ```

### 3. Frontend Setup
1. Navigate to `/frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure endpoints:
   ```bash
   cp .env.example .env
   ```
4. Start development build server:
   ```bash
   npm run dev
   ```

---

## Running with Docker (Compose Stack)

To spin up the entire development stack (PostgreSQL, Redis, Daphne ASGI service):
1. Run the compose environment from the project root:
   ```bash
   docker-compose up --build
   ```
2. Apply migrations inside container:
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

---

## Testing

Run Django backend test suites:
```bash
cd backend
python manage.py test
```

*Note: Frontend automated tests will only be added if a testing framework already exists. No new testing dependency is introduced in this phase.*

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
