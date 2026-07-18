import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetails from "./pages/CourseDetails";
import Modules from "./pages/Modules";
import Lessons from "./pages/Lessons";
import Quiz from "./pages/Quiz";
import LessonDetails from "./pages/LessonDetails";
import MentorDashboard from "./pages/MentorDashboard";
import CreateCourse from "./pages/CreateCourse";
import AdminDashboard from "./pages/AdminDashboard";
import EditCourse from "./pages/EditCourse";
import CreateModule from "./pages/CreateModule";
import EditModule from "./pages/EditModule";
import CreateLesson from "./pages/CreateLesson";
import EditLesson from "./pages/EditLesson";
import CreateQuiz from "./pages/CreateQuiz";
import CreateQuestion from "./pages/CreateQuestion";
import StudentProgress from "./pages/StudentProgress";
import PendingMentors from "./pages/PendingMentors";
import PendingEnrollments from "./pages/PendingEnrollments";
import VerifyOTP from "./pages/VerifyOTP";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyResetOTP from "./pages/VerifyResetOTP";
import ResetPassword from "./pages/ResetPassword";

import QA from "./pages/Q&A";
import Discussion from "./pages/Discussion";
import Reviews from "./pages/Reviews";
import Certificate from "./pages/Certificate";
import SearchResults from "./pages/SearchResults";
import Notifications from "./pages/Notifications";
import RefundRequests from "./pages/RefundRequests";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import PaymentHistory from "./pages/PaymentHistory";

import ProtectedRoute from "./components/ProtectedRoute";
import { NotificationProvider } from "./components/NotificationProvider";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <Routes>
        <Route path="/" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <Courses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id"
        element={
          <ProtectedRoute>
            <CourseDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/modules"
        element={
          <ProtectedRoute>
            <Modules />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/qa"
        element={
          <ProtectedRoute>
            <QA />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/chat"
        element={
          <ProtectedRoute>
            <Discussion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/reviews"
        element={
          <ProtectedRoute>
            <Reviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/certificate"
        element={
          <ProtectedRoute>
            <Certificate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/modules/:moduleId/lessons"
        element={
          <ProtectedRoute>
            <Lessons />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/:id"
        element={
          <ProtectedRoute>
            <Quiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lessons/:id"
        element={
          <ProtectedRoute>
            <LessonDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor"
        element={
          <ProtectedRoute allowedRoles={["mentor"]}>
            <MentorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/create-course"
        element={
          <ProtectedRoute allowedRoles={["mentor"]}>
            <CreateCourse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor/course/:id/edit"
        element={
          <ProtectedRoute allowedRoles={["mentor"]}>
            <EditCourse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/modules/create"
        element={
          <ProtectedRoute allowedRoles={["mentor"]}>
            <CreateModule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/modules/:id/edit"
        element={
          <ProtectedRoute allowedRoles={["mentor"]}>
            <EditModule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/modules/:moduleId/lessons/create"
        element={
          <ProtectedRoute allowedRoles={["mentor"]}>
            <CreateLesson />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lessons/:id/edit"
        element={
          <ProtectedRoute allowedRoles={["mentor"]}>
            <EditLesson />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lessons/:lessonId/create-quiz"
        element={
          <ProtectedRoute allowedRoles={["mentor"]}>
            <CreateQuiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/:quizId/questions"
        element={
          <ProtectedRoute allowedRoles={["mentor"]}>
            <CreateQuestion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <StudentProgress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/refund-requests"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <RefundRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pending-mentors"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PendingMentors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/enrollments"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PendingEnrollments />
          </ProtectedRoute>
        }
      />
      <Route path="/verify-otp"
        element={<VerifyOTP />}
      />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />
      <Route
        path="/verify-reset-otp"
        element={<VerifyResetOTP />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />
      <Route
        path="/checkout/:courseId"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-success"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-cancel"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <PaymentCancel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-history"
        element={
          <ProtectedRoute allowedRoles={["student", "admin"]}>
            <PaymentHistory />
          </ProtectedRoute>
        }
      />

      </Routes>
    </NotificationProvider>
  </ThemeProvider>
  );
}

export default App;