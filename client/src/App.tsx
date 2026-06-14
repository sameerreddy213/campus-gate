import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import LoginPage from "./pages/Login";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import AuditLogsPage from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";

// Dev Admin
import DevAdminDashboard from "./pages/dev-admin/Dashboard";
import CollegesPage from "./pages/dev-admin/Colleges";
import AddCollegePage from "./pages/dev-admin/AddCollege";
import AddAdminPage from "./pages/dev-admin/AddAdmin";
import AnalyticsPage from "./pages/dev-admin/Analytics";

// College Admin
import CollegeAdminDashboard from "./pages/college-admin/Dashboard";
import WardensPage from "./pages/college-admin/Wardens";
import StudentsPage from "./pages/college-admin/Students";
import AssignStudentsPage from "./pages/college-admin/AssignStudents";
import CollegeAdminRequestsPage from "./pages/college-admin/Requests";
import ReportsPage from "./pages/college-admin/Reports";
import WatchmenPage from "./pages/college-admin/Watchmen";
import SettingsPage from "./pages/college-admin/Settings";

// Warden
import WardenDashboard from "./pages/warden/Dashboard";
import WardenStudentsPage from "./pages/warden/Students";
import WardenRequestsPage from "./pages/warden/Requests";
import WardenHistoryPage from "./pages/warden/History";

// Student
import StudentDashboard from "./pages/student/Dashboard";
import RaiseRequestPage from "./pages/student/RaiseRequest";
import MyRequestsPage from "./pages/student/MyRequests";
import StudentHistoryPage from "./pages/student/History";

// Parent
import ParentDashboard from "./pages/parent/Dashboard";
import ParentHistoryPage from "./pages/parent/History";

// Watchman
import WatchmanDashboard from "./pages/watchman/Dashboard";

import Profile from "./pages/Profile";

const queryClient = new QueryClient();

import LandingPage from "./pages/LandingPage";
import Documentation from "./pages/Documentation";
import PageTransition from "@/components/PageTransition";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
            <Route path="/documentation" element={<PageTransition><Documentation /></PageTransition>} />
            <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
            <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
            <Route path="/reset-password/:token" element={<PageTransition><ResetPasswordPage /></PageTransition>} />

            {/* Dev Admin */}
            <Route element={<DashboardLayout />}>
              <Route path="/dev-admin" element={<DevAdminDashboard />} />
              <Route path="/dev-admin/colleges" element={<CollegesPage />} />
              <Route path="/dev-admin/add-college" element={<AddCollegePage />} />
              <Route path="/dev-admin/add-admin" element={<AddAdminPage />} />
              <Route path="/dev-admin/analytics" element={<AnalyticsPage />} />
              <Route path="/dev-admin/audit-logs" element={<AuditLogsPage />} />
            </Route>
            <Route element={<DashboardLayout />}>
              <Route path="/college-admin" element={<CollegeAdminDashboard />} />
              <Route path="/college-admin/wardens" element={<WardensPage />} />
              <Route path="/college-admin/watchmen" element={<WatchmenPage />} />
              <Route path="/college-admin/students" element={<StudentsPage />} />
              <Route path="/college-admin/assign" element={<AssignStudentsPage />} />
              <Route path="/college-admin/requests" element={<CollegeAdminRequestsPage />} />
              <Route path="/college-admin/reports" element={<ReportsPage />} />
              <Route path="/college-admin/settings" element={<SettingsPage />} />
              <Route path="/college-admin/audit-logs" element={<AuditLogsPage />} />
            </Route>

            {/* Warden */}
            <Route element={<DashboardLayout />}>
              <Route path="/warden" element={<WardenDashboard />} />
              <Route path="/warden/students" element={<WardenStudentsPage />} />
              <Route path="/warden/requests" element={<WardenRequestsPage />} />
              <Route path="/warden/history" element={<WardenHistoryPage />} />
            </Route>

            {/* Student */}
            <Route element={<DashboardLayout />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/raise-request" element={<RaiseRequestPage />} />
              <Route path="/student/requests" element={<MyRequestsPage />} />
              <Route path="/student/history" element={<StudentHistoryPage />} />
            </Route>

            {/* Parent */}
            <Route element={<DashboardLayout />}>
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/parent/history" element={<ParentHistoryPage />} />
            </Route>

            {/* Watchman */}
            <Route element={<DashboardLayout />}>
              <Route path="/watchman" element={<WatchmanDashboard />} />
            </Route>

            {/* Shared Profile Route - Accessible to all logged in users inside layout */}
            <Route element={<DashboardLayout />}>
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
