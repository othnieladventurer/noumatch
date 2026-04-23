// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaSignOutAlt } from "react-icons/fa";
import BrandLogo from "./BrandLogo";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userLoggedIn, setUserLoggedIn] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem("access");
    setUserLoggedIn(!!accessToken);
  }, []);

  const handleScroll = (id) => (e) => {
    e.preventDefault();
    
    // If we're not on the home page, navigate to home first
    if (location.pathname !== "/") {
      navigate("/");
      // Wait for navigation to complete before scrolling
      setTimeout(() => {
        const section = document.getElementById(id);
        if (section) {
          section.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      // Already on home page, just scroll
      const section = document.getElementById(id);
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
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
          <BrandLogo className="navbar-brand-logo" height={36} />
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
                  <Link
                    className="btn btn-danger d-flex justify-content-center align-items-center p-2"
                    to="/dashboard"
                    title="Dashboard"
                  >
                    <FaTachometerAlt size={20} />
                  </Link>
                </li>
                <li className="nav-item mt-2 mt-lg-0">
                  <button
                    className="btn btn-secondary d-flex justify-content-center align-items-center p-2"
                    onClick={handleLogout}
                    title="Déconnexion"
                  >
                    <FaSignOutAlt size={20} />
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
