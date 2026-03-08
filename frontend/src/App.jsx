// src/App.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

// Components
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";

// Pages
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import EmailVerify from "./pages/VerifyEmail.jsx";
import EmailVerified from "./pages/VerifyEmailSuccess.jsx";

import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ResetPasswordDone from "./pages/ResetSuccess.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Profile from './pages/Profile';
import ProfileDetail from './pages/ProfileDetail';
import Messages from './pages/Messages'; // IMPORT Messages
import Conversation from './pages/Conversation'; // IMPORT Conversation

export default function App() {
  const location = useLocation();

  // Routes where public navbar/footer should NOT appear
  const hidePublicLayoutRoutes = [
    "/dashboard",
    "/profile",
    "/profile/",
    "/messages", // ADD messages routes
    "/messages/", // ADD messages routes
    "/login",
    "/register",
    "/verify-email",
    "/email-verified",
    "/forgot-password",
    "/reset-password",
    "/reset-password-done",
  ];

  const shouldHideLayout = hidePublicLayoutRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  return (
    <div className="App">
      {!shouldHideLayout && <Navbar />}

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Email Verification */}
          <Route path="/verify-email" element={<EmailVerify />} />
          <Route path="/email-verified" element={<EmailVerified />} />

          {/* Password Reset */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/reset-password-done" element={<ResetPasswordDone />} />

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<ProfileDetail />} />

          {/* MESSAGES ROUTES - ADD THESE */}
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Conversation />} />
        </Routes>
      </main>

      {!shouldHideLayout && <Footer />}
    </div>
  );
}