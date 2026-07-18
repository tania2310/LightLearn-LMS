# LightLearn LMS — System Architecture & Flows

This document details systems layout, data modeling, authentication routing, and transactional flowcharts using Mermaid diagrams.

---

## 1. System Architecture Diagram

```mermaid
graph TD
    Client[React Client SPA] <-->|HTTP/JSON API| Django[Gunicorn WSGI / Daphne ASGI]
    Client <-->|WebSockets| Daphne[Daphne ASGI Server]
    Django <-->|ORM / SQL| DB[(PostgreSQL Database)]
    Daphne <-->|PubSub Channel Layer| Redis[(Redis Server)]
    Django <-->|Third Party API calls| PayPal[PayPal Sandbox REST API]
```

---

## 2. Database ER Diagram

```mermaid
erDiagram
    USER {
        int id
        string username
        string email
        string role
        boolean is_approved
    }
    COURSE {
        int id
        string title
        decimal price
        string status
    }
    ENROLLMENT {
        int id
        string status
        datetime created_at
    }
    PAYMENT {
        int id
        string provider
        decimal amount
        string status
    }
    CHATROOM {
        int id
        string title
        boolean is_locked
    }

    USER ||--o{ COURSE : "mentors"
    USER ||--o{ ENROLLMENT : "enrolls"
    COURSE ||--o{ ENROLLMENT : "contains"
    ENROLLMENT ||--|| PAYMENT : "finances"
    COURSE ||--|| CHATROOM : "has"
```

---

## 3. JWT Authentication Flow

```mermaid
sequenceDiagram
    participant Client as React SPA Client
    participant Auth as SimpleJWT / DRF Auth
    participant DB as PostgreSQL Database

    Client->>Auth: POST /api/accounts/login/ (username, password)
    Auth->>DB: Query User match & password verify
    DB-->>Auth: Verified user match
    Auth-->>Client: Returns HTTP 200 OK (access_token, refresh_token)
    Note over Client: Client app stores access_token in localStorage
```

---

## 4. Course Enrollment Flow

```mermaid
sequenceDiagram
    participant Student as Student Client
    participant API as DRF Enrollments API
    participant DB as Database

    Student->>API: POST /api/enrollments/ (course_id)
    Note over API: Check if Course Price > 0
    alt Course is Free
        API->>DB: Create Enrollment status="approved"
        API-->>Student: Success: 201 Created (Approved status)
    else Course is Paid
        API->>DB: Create Enrollment status="pending"
        API-->>Student: Success: 201 Created (Pending status)
    end
```

---

## 5. Payment Flow (PayPal Integration)

```mermaid
sequenceDiagram
    participant Student as Student Client
    participant API as Payments API
    participant Gateway as PayPal
    participant DB as Database

    Student->>API: POST /paypal/create-order/
    API->>Gateway: Create order payload
    Gateway-->>API: Returns order ID and approval URL
    API-->>Student: Returns order ID and approval URL
    Student->>Gateway: Redirect student to approval URL
    Gateway-->>Student: Approved redirect to success page
    Student->>API: POST /paypal/capture-order/ (order_id)
    API->>Gateway: Capture order API request
    Gateway-->>API: Status = COMPLETED
    API->>DB: Update payment to Paid & enrollment to approved
    API-->>Student: Success: payment verified
```

---

## 6. Chat / WebSocket Flow

```mermaid
sequenceDiagram
    participant Moderator as Mentor / Admin Client
    participant Student as Student Client
    participant Daphne as Daphne ASGI Server
    participant Redis as Redis Channel Layer

    Student->>Daphne: WebSocket Connect (ws/chat/<course_id>/)
    Daphne->>Redis: Subscribe to group "chat_<course_id>"
    Moderator->>Daphne: POST /discussion/chatrooms/<room_id>/lock/
    Daphne->>Redis: Broadcast LOCK event to group
    Redis-->>Student: Locked input state (disable text entry)
```
