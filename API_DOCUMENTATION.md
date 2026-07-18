# LightLearn LMS — API Specification Document

This document lists HTTP REST API specifications, payload schemas, query parameters, and token requirements for the LightLearn LMS backend.

## Authentication Headers

All endpoints except registration, login, verification, and webhooks require the simplejwt access token passed inside the HTTP authorization header:
```http
Authorization: Bearer <your_jwt_access_token>
```

---

## Response Status Codes

- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing or expired JWT credentials.
- `403 Forbidden`: Insufficient permissions to perform the action.
- `404 Not Found`: Resource does not exist.
- `500 Server Error`: Unexpected backend server failure.

---

## Endpoint List

### 1. Accounts API

#### User Registration
- **URL**: `/api/accounts/register/`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "username": "student_johndoe",
    "email": "johndoe@example.com",
    "password": "strongPassword123",
    "role": "student",
    "phone_number": "1234567890"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful. Please check email for OTP verification code."
  }
  ```

#### User Login (JWT Obtain Pair)
- **URL**: `/api/accounts/login/`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "username": "student_johndoe",
    "password": "strongPassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsIn...",
    "access": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

---

### 2. Courses API

#### List Approved Courses
- **URL**: `/api/courses/`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "title": "Introduction to Python",
      "description": "Learn basic Python concepts.",
      "category": "Programming",
      "level": "beginner",
      "price": "0.00",
      "mentor": "mentor_jane"
    }
  ]
  ```

#### Create Course (Mentor)
- **URL**: `/api/courses/`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "title": "Advanced Django",
    "description": "Building scalable backend microservices.",
    "category": "Programming",
    "level": "advanced",
    "language": "English",
    "duration": 15,
    "price": "299.00"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": 2,
    "title": "Advanced Django",
    "status": "draft"
  }
  ```

---

### 3. Enrollments API

#### Request Enrollment
- **URL**: `/api/enrollments/`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "course": 2
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": 5,
    "course": 2,
    "status": "pending",
    "created_at": "2026-07-17T09:00:00Z"
  }
  ```

---

### 4. Payments API

#### Create PayPal Order
- **URL**: `/api/paypal/create-order/`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "enrollment_id": 5
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "PAY-SANDBOX-ORDER-1",
    "approval_url": "https://paypal.com/approve/mock"
  }
  ```

#### Trigger Admin Refund
- **URL**: `/api/refund/<payment_id>/`
- **Method**: `POST`
- **Response (200 OK)**:
  ```json
  {
    "status": "Refunded",
    "message": "Refund processed and entitlement revoked."
  }
  ```

---

### 5. Discussion API

#### Lock Chatroom (Mentor/Admin)
- **URL**: `/api/discussion/chatrooms/<room_id>/lock/`
- **Method**: `POST`
- **Response (200 OK)**:
  ```json
  {
    "status": "locked",
    "message": "Chatroom general locked."
  }
  ```
