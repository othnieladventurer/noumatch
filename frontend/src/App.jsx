// src/App.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

// Context Providers
import { NotificationProvider } from "./context/NotificationContext";

// Components
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";

// Pages
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Waitlist from "./pages/Waitlist.jsx";
import WaitlistWomen from "./pages/WaitlistWomen.jsx";
import WaitlistMen from "./pages/WaitlistMen.jsx";
import WaitlistStats from "./pages/WaitlistStats.jsx";

import EmailVerify from "./pages/VerifyEmail.jsx";
import EmailVerified from "./pages/VerifyEmailSuccess.jsx";

import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ResetPasswordDone from "./pages/ResetSuccess.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Profile from './pages/Profile';
import ProfileDetail from './pages/ProfileDetail';
import Messages from './pages/Messages';
import Conversation from './pages/Conversation';
import Notifications from './pages/Notifications'; 
import PrivacyPolicy from "./pages/PrivacyPolicy";
import VerifyOtp from "./pages/VerifyOtp";
import Terms from "./pages/Terms";

// Admin Pages
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminUserDetail from "./pages/AdminUserDetail.jsx";

export default function App() {
  const location = useLocation();

  // Routes where public navbar/footer should NOT appear
  const hidePublicLayoutRoutes = [
    "/dashboard",
    "/profile",
    "/profile/",
    "/messages",
    "/messages/",
    "/notifications",
    "/notifications/",
    "/login",
    "/register",
    "/verify-email",
    "/email-verified",
    "/forgot-password",
    "/reset-password",
    "/reset-password-done",
    "/verify-otp",
    "/admin/login",
    "/admin/dashboard",
    "/admin/users",
    "/admin/users/detail/", // for dynamic detail route
  ];

  const shouldHideLayout = hidePublicLayoutRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  return (
    <NotificationProvider>
      <div className="App">
        {!shouldHideLayout && <Navbar />}

        <main>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/waitlist/women" element={<WaitlistWomen />} />
            <Route path="/waitlist/men" element={<WaitlistMen />} />
            <Route path="/waitlist/stats" element={<WaitlistStats />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Email Verification */}
            <Route path="/verify-email" element={<EmailVerify />} />
            <Route path="/email-verified" element={<EmailVerified />} />

            {/* Password Reset */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/reset-password-done" element={<ResetPasswordDone />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />

            {/* Dashboard Routes - Authenticated Users */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<ProfileDetail />} />

            {/* Messages Routes */}
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Conversation />} />

            {/* Notifications Route */}
            <Route path="/notifications" element={<Notifications />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/detail/:id" element={<AdminUserDetail />} />
          </Routes>
        </main>

        {!shouldHideLayout && <Footer />}
      </div>
    </NotificationProvider>
  );
}