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

export default function App() {
  const location = useLocation();

  // Routes where public navbar/footer should NOT appear
  const hideLayoutRoutes = [
    "/login",
    "/register",
    "/dashboard",
  ];

  const shouldHideLayout = hideLayoutRoutes.includes(location.pathname);

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

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      {!shouldHideLayout && <Footer />}
    </div>
  );
}