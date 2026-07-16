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

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
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
        path="/admin/pending-mentors"
        element={<PendingMentors />}
      />
      <Route
        path="/admin/enrollments"
        element={<PendingEnrollments />}
      />
    </Routes>
  );
}

export default App;