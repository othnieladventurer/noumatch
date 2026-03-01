import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart, FaBell, FaEnvelope } from "react-icons/fa";

export default function DashboardNavbar({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  // Dummy messages with read/unread
  const messages = [
    { id: 1, text: "Marie: Hey! How are you?", read: false },
    { id: 2, text: "John: Let's meet tomorrow", read: true },
    { id: 3, text: "Support: Welcome to NouMatch!", read: false },
  ];

  const notifications = [
    { id: 1, text: "New match found!", read: false },
    { id: 2, text: "Someone liked your profile", read: true },
    { id: 3, text: "Profile updated successfully", read: true },
  ];

  // Helper to get full URL for profile photo
  const getProfilePhotoUrl = (path) => {
    if (!path) return "https://via.placeholder.com/40";
    return `http://127.0.0.1:8000${path}`; // prepend your backend URL
  };

  return (
    <nav
      className="navbar navbar-expand-lg bg-white shadow-sm"
      style={{ borderBottom: "1px solid #f1f1f1" }}
    >
      <div className="container">
        {/* Logo */}
        <Link className="navbar-brand d-flex align-items-center" to="/dashboard">
          <FaHeart className="text-danger me-2" />
          <span className="fw-bold fs-4" style={{ color: "#7b2cbf" }}>
            NouMatch
          </span>
        </Link>

        {/* Right Side */}
        <div className="d-flex align-items-center gap-3 ms-auto">

          {/* Inbox */}
          <div className="dropdown">
            <button className="btn btn-light position-relative" data-bs-toggle="dropdown">
              <FaEnvelope size={18} />
              {messages.some(m => !m.read) && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {messages.filter(m => !m.read).length}
                </span>
              )}
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm p-2" style={{ width: "280px", maxWidth: "90vw" }}>
              <li className="dropdown-header fw-bold">Messages</li>
              {messages.map(msg => (
                <li key={msg.id}>
                  <span className={`dropdown-item small text-wrap ${msg.read ? "" : "fw-bold bg-light"}`} style={{ borderRadius: "4px" }}>
                    💌 {msg.text}
                  </span>
                </li>
              ))}
              <li><hr className="dropdown-divider" /></li>
              <li>
                <Link className="dropdown-item text-center small text-primary" to="#">View All</Link>
              </li>
            </ul>
          </div>

          {/* Notifications */}
          <div className="dropdown">
            <button className="btn btn-light position-relative" data-bs-toggle="dropdown">
              <FaBell size={18} />
              {notifications.some(n => !n.read) && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm p-2" style={{ width: "280px", maxWidth: "90vw" }}>
              <li className="dropdown-header fw-bold">Notifications</li>
              {notifications.map(notif => (
                <li key={notif.id}>
                  <span className={`dropdown-item small text-wrap ${notif.read ? "" : "fw-bold bg-light"}`} style={{ borderRadius: "4px" }}>
                    🔔 {notif.text}
                  </span>
                </li>
              ))}
              <li><hr className="dropdown-divider" /></li>
              <li>
                <Link className="dropdown-item text-center small text-primary" to="#">View All</Link>
              </li>
            </ul>
          </div>

          {/* Profile */}
          <div className="dropdown">
            <button className="btn p-0 border-0 bg-transparent" data-bs-toggle="dropdown">
              <img
                src={getProfilePhotoUrl(user?.profile_photo)}
                alt="profile"
                className="rounded-circle"
                width="40"
                height="40"
                style={{ objectFit: "cover" }}
              />
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm" style={{ width: "200px", maxWidth: "90vw" }}>
              <li><Link className="dropdown-item" to="/profile">My Profile</Link></li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger" onClick={handleLogout}>Logout</button>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </nav>
  );
}