// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaSignOutAlt } from "react-icons/fa";
import BrandLogo from "./BrandLogo";
import "./Navbar.css";

const NAV_LINKS = [
  { label: "À propos",        id: "who" },
  { label: "Comment ça marche", id: "features" },
  { label: "Nos valeurs",     id: "noumatchesprit" },
  { label: "FAQ",             id: "faq" },
  { label: "Contact",         id: "contact" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const accessToken = localStorage.getItem("access");
    setUserLoggedIn(!!accessToken);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    NAV_LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  const handleNavClick = (id) => (e) => {
    e.preventDefault();
    // Close mobile menu
    const collapse = document.getElementById("navbarNav");
    if (collapse?.classList.contains("show")) {
      collapse.classList.remove("show");
    }
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUserLoggedIn(false);
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white sticky-top">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <BrandLogo className="navbar-brand-logo" height={36} />
        </Link>

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

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto gap-3 text-center">
            {NAV_LINKS.map(({ label, id }) => (
              <li className="nav-item" key={id}>
                <a
                  className={`nav-link${activeSection === id ? " nm-nav-active" : ""}`}
                  href={`#${id}`}
                  onClick={handleNavClick(id)}
                >
                  {label}
                </a>
              </li>
            ))}

            {!userLoggedIn ? (
              <>
                <li className="nav-item mt-2 mt-lg-0">
                  <Link className="btn btn-secondary w-100 w-lg-auto" to="/login">
                    Connexion
                  </Link>
                </li>
                <li className="nav-item mt-2 mt-lg-0">
                  <Link className="btn btn-danger w-100 w-lg-auto" to="/register">
                    S'inscrire
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item mt-2 mt-lg-0">
                  <Link
                    className="btn btn-danger d-flex justify-content-center align-items-center gap-2 px-3"
                    to="/dashboard"
                  >
                    <FaTachometerAlt size={14} />
                    Mon compte
                  </Link>
                </li>
                <li className="nav-item mt-2 mt-lg-0">
                  <button
                    className="btn btn-secondary d-flex justify-content-center align-items-center gap-2 px-3"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt size={14} />
                    Se déconnecter
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
