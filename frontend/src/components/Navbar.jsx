// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart } from "react-icons/fa";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  // Check login status on mount
  useEffect(() => {
    const accessToken = localStorage.getItem("access");
    setUserLoggedIn(!!accessToken);
  }, []);

  const handleScroll = (id) => (e) => {
    e.preventDefault();
    const section = document.getElementById(id);
    if (section) section.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUserLoggedIn(false);
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow fixed-top">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <FaHeart className="text-danger me-2" />
          <span className="text-primary fw-bold fs-4">NouMatch</span>
        </Link>

        {/* Hamburger */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapse */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto gap-3 text-center">
            <li className="nav-item">
              <a className="nav-link" href="#who" onClick={handleScroll("who")}>
                Qui sommes-nous
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#features" onClick={handleScroll("features")}>
                Ce que nous faisons
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#noumatchesprit" onClick={handleScroll("noumatchesprit")}>
                L'esprit NouMatch
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#faq" onClick={handleScroll("faq")}>
                FAQ
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#contact" onClick={handleScroll("contact")}>
                Contact
              </a>
            </li>

            {/* Conditional buttons */}
            {!userLoggedIn ? (
              <li className="nav-item mt-2 mt-lg-0">
                <Link className="btn btn-danger w-100 w-lg-auto" to="/login">
                  Se connecter
                </Link>
              </li>
            ) : (
              <>
                <li className="nav-item mt-2 mt-lg-0">
                  <Link className="btn btn-primary w-100 w-lg-auto" to="/dashboard">
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item mt-2 mt-lg-0">
                  <button className="btn btn-secondary w-100 w-lg-auto" onClick={handleLogout}>
                    Déconnexion
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
