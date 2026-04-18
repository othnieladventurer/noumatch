import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaFemale,
  FaMale,
  FaCheckCircle,
  FaSpinner,
  FaChartLine,
  FaExclamationTriangle,
  FaUserPlus,
  FaUserCheck,
  FaClock,
  FaPercentage,
  FaCheck,
  FaTimes,
  FaUserGraduate,
  FaLock,
  FaSignOutAlt,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import AOS from "aos";
import "aos/dist/aos.css";

export default function WaitlistStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: "ease-in-out",
    });
    
    // FIXED: Check for admin_access token, not regular access
    const token = localStorage.getItem("admin_access");
    if (token) {
      setIsAuthorized(true);
      fetchEntries();
    }
    
    fetchData();

    return () => {
      AOS.refresh();
    };
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchEntries();
    }
  }, [isAuthorized]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get("/waitlist/stats/");
      setStats(response.data);
    } catch (err) {
      console.error("Stats fetch error:", err);
      setError("Impossible de charger les statistiques. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async () => {
    try {
      console.log("Fetching entries from: /waitlist/entries/");
      // FIXED: Use adminAPI or add admin_access token
      const token = localStorage.getItem("admin_access");
      const response = await API.get("/waitlist/entries/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Entries response:", response.data);
      const entriesData = response.data.results || response.data;
      setEntries(entriesData);
    } catch (err) {
      console.error("Failed to fetch entries:", err);
      if (err.response?.status === 401) {
        setIsAuthorized(false);
        localStorage.removeItem("admin_access");
        localStorage.removeItem("admin_refresh");
      }
    }
  };

  const handleAccept = async (entryId) => {
    const entryToRemove = entries.find(entry => entry.id === entryId);
    
    setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
    
    if (stats) {
      const updatedStats = { ...stats };
      if (entryToRemove) {
        updatedStats.total_waiting = Math.max(0, (updatedStats.total_waiting || 0) - 1);
        if (entryToRemove.gender === 'female') {
          updatedStats.women_waiting = Math.max(0, (updatedStats.women_waiting || 0) - 1);
          updatedStats.women_accepted = (updatedStats.women_accepted || 0) + 1;
        } else {
          updatedStats.men_waiting = Math.max(0, (updatedStats.men_waiting || 0) - 1);
          updatedStats.men_accepted = (updatedStats.men_accepted || 0) + 1;
        }
      }
      setStats(updatedStats);
    }
    
    try {
      const token = localStorage.getItem("admin_access");
      await API.post(`/waitlist/admin/accept/${entryId}/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error("Accept error:", err);
      setEntries(prevEntries => [...prevEntries, entryToRemove].sort((a, b) => a.position - b.position));
      await fetchData();
      setError("Erreur lors de l'acceptation: " + (err.response?.data?.error || err.message));
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleReject = async (entryId) => {
    const entryToRemove = entries.find(entry => entry.id === entryId);
    
    setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
    
    if (stats) {
      const updatedStats = { ...stats };
      if (entryToRemove) {
        updatedStats.total_waiting = Math.max(0, (updatedStats.total_waiting || 0) - 1);
        if (entryToRemove.gender === 'female') {
          updatedStats.women_waiting = Math.max(0, (updatedStats.women_waiting || 0) - 1);
        } else {
          updatedStats.men_waiting = Math.max(0, (updatedStats.men_waiting || 0) - 1);
        }
      }
      setStats(updatedStats);
    }
    
    try {
      const token = localStorage.getItem("admin_access");
      await API.delete(`/waitlist/admin/delete/${entryId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
      setEntries(prevEntries => [...prevEntries, entryToRemove].sort((a, b) => a.position - b.position));
      await fetchData();
      setError("Erreur lors de la suppression: " + (err.response?.data?.error || err.message));
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      // FIXED: Use admin login endpoint
      const response = await API.post("/noumatch-admin/admin_login/", {
        email: adminEmail,
        password: adminPassword
      });
      
      if (response.data.access) {
        localStorage.setItem("admin_access", response.data.access);
        localStorage.setItem("admin_refresh", response.data.refresh);
        setIsAuthorized(true);
        setShowAdmin(false);
        setAdminEmail("");
        setAdminPassword("");
        await fetchEntries();
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Email ou mot de passe incorrect");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_access");
    localStorage.removeItem("admin_refresh");
    setIsAuthorized(false);
    setEntries([]);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100" style={{ paddingTop: "60px" }}>
        <div className="text-center">
          <div className="spinner-border text-danger mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="text-muted">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="container py-5" style={{ paddingTop: "80px" }}>
        <div className="alert alert-danger text-center shadow-sm">
          <FaExclamationTriangle size={24} className="me-2" />
          <strong>{error}</strong>
          <button className="btn btn-sm btn-outline-danger ms-3" onClick={fetchData}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container py-5" style={{ paddingTop: "80px" }}>
        <div className="alert alert-warning text-center">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  const totalWaiting = stats.total_waiting || 0;
  const womenWaiting = stats.women_waiting || 0;
  const menWaiting = stats.men_waiting || 0;
  const womenAccepted = stats.women_accepted || 0;
  const menAccepted = stats.men_accepted || 0;
  const totalAccepted = womenAccepted + menAccepted;
  
  const womenWaitingPercentage = totalWaiting > 0 ? ((womenWaiting / totalWaiting) * 100).toFixed(1) : 0;
  const menWaitingPercentage = totalWaiting > 0 ? ((menWaiting / totalWaiting) * 100).toFixed(1) : 0;
  const womenAcceptedPercentage = totalAccepted > 0 ? ((womenAccepted / totalAccepted) * 100).toFixed(1) : 0;
  const menAcceptedPercentage = totalAccepted > 0 ? ((menAccepted / totalAccepted) * 100).toFixed(1) : 0;

  return (
    <div style={{ width: "100%", minHeight: "100vh", paddingTop: "60px" }}>
      {/* Error Toast/Alert */}
      {error && (
        <div className="container mt-3 position-fixed top-0 start-50 translate-middle-x" style={{ zIndex: 9999, maxWidth: "500px" }}>
          <div className="alert alert-danger alert-dismissible fade show shadow-lg" role="alert">
            <FaExclamationTriangle className="me-2" />
            {error}
            <button type="button" className="btn-close" onClick={() => setError("")}></button>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdmin && !isAuthorized && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center" style={{ zIndex: 9999 }}>
          <div className="card shadow-lg" style={{ width: "400px" }}>
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Accès Administrateur</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleAdminLogin}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mot de passe</label>
                  <input
                    type="password"
                    className="form-control"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary flex-grow-1" disabled={loginLoading}>
                    {loginLoading ? <FaSpinner className="spin" /> : <FaLock />} Accéder
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdmin(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section - Public stats (always visible) */}
      <section
        className="position-relative d-flex align-items-center"
        style={{
          minHeight: "40vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          className="position-absolute w-100 h-100"
          style={{
            background: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
            top: 0,
            left: 0,
            opacity: 0.1,
          }}
        ></div>
        <div className="container position-relative px-3" style={{ zIndex: 2 }}>
          <div className="row justify-content-center text-center">
            <div className="col-lg-8 text-white" data-aos="fade-down">
              <h1 className="display-4 fw-bold mb-4">
                <FaChartLine className="me-3" style={{ fontSize: "3rem" }} />
                Statistiques de la liste d'attente
              </h1>
              <p className="lead mb-4">
                Suivez l'évolution des inscriptions et l'équilibre des genres avant le lancement
              </p>
              <div className="d-flex justify-content-center gap-3">
                {!isAuthorized ? (
                  <button
                    onClick={() => setShowAdmin(true)}
                    className="btn btn-outline-light"
                  >
                    <FaUserGraduate className="me-2" />
                    Accès Administrateur
                  </button>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="btn btn-outline-light"
                  >
                    <FaSignOutAlt className="me-2" />
                    Se déconnecter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards - Public */}
      <section className="py-5">
        <div className="container px-3">
          <div className="row g-4" data-aos="fade-up">
            <div className="col-md-3">
              <div className="card border-0 shadow-lg h-100 text-center hover-lift">
                <div className="card-body p-4">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "70px", height: "70px" }}>
                    <FaUsers size={35} className="text-primary" />
                  </div>
                  <h3 className="fw-bold mb-2 display-6">{totalWaiting}</h3>
                  <p className="text-muted mb-0">En attente</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-lg h-100 text-center hover-lift">
                <div className="card-body p-4">
                  <div className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "70px", height: "70px" }}>
                    <FaFemale size={35} className="text-danger" />
                  </div>
                  <h3 className="fw-bold mb-2 display-6">{womenWaiting}</h3>
                  <p className="text-muted mb-0">Femmes en attente</p>
                  <small className="text-muted">{womenWaitingPercentage}%</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-lg h-100 text-center hover-lift">
                <div className="card-body p-4">
                  <div className="bg-info bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "70px", height: "70px" }}>
                    <FaMale size={35} className="text-info" />
                  </div>
                  <h3 className="fw-bold mb-2 display-6">{menWaiting}</h3>
                  <p className="text-muted mb-0">Hommes en attente</p>
                  <small className="text-muted">{menWaitingPercentage}%</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-lg h-100 text-center hover-lift">
                <div className="card-body p-4">
                  <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "70px", height: "70px" }}>
                    <FaCheckCircle size={35} className="text-success" />
                  </div>
                  <h3 className="fw-bold mb-2 display-6">{totalAccepted}</h3>
                  <p className="text-muted mb-0">Déjà acceptés</p>
                  <small className="text-muted">
                    {womenAccepted} F · {menAccepted} H
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gender Distribution Section - Public */}
      <section className="py-5 bg-light">
        <div className="container px-3">
          <div className="row g-4">
            <div className="col-md-6" data-aos="fade-right">
              <div className="card border-0 shadow-lg h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-4">
                    <FaUserCheck className="text-primary me-2" />
                    Distribution des inscrits acceptés
                  </h5>
                  <div className="text-center mb-4">
                    <div className="row">
                      <div className="col-6">
                        <div className="p-4 rounded-3 bg-white">
                          <FaFemale size={40} className="text-danger mb-3" />
                          <h2 className="fw-bold mb-0">{womenAcceptedPercentage}%</h2>
                          <p className="text-muted mb-0">Femmes</p>
                          <small>{womenAccepted} acceptées</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-4 rounded-3 bg-white">
                          <FaMale size={40} className="text-primary mb-3" />
                          <h2 className="fw-bold mb-0">{menAcceptedPercentage}%</h2>
                          <p className="text-muted mb-0">Hommes</p>
                          <small>{menAccepted} acceptés</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="progress" style={{ height: "25px" }}>
                    <div 
                      className="progress-bar bg-danger d-flex align-items-center justify-content-center" 
                      style={{ width: `${womenAcceptedPercentage}%` }}
                    >
                      {womenAcceptedPercentage}%
                    </div>
                    <div 
                      className="progress-bar bg-primary d-flex align-items-center justify-content-center" 
                      style={{ width: `${menAcceptedPercentage}%` }}
                    >
                      {menAcceptedPercentage}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6" data-aos="fade-left">
              <div className="card border-0 shadow-lg h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-4">
                    <FaPercentage className="text-primary me-2" />
                    Objectif d'équilibre
                  </h5>
                  {stats.target_ratio ? (
                    <div>
                      <div className="mb-4">
                        <div className="d-flex justify-content-between mb-2">
                          <span>Femmes</span>
                          <span className="fw-bold">{stats.target_ratio.women}%</span>
                        </div>
                        <div className="progress" style={{ height: "10px" }}>
                          <div className="progress-bar bg-danger" style={{ width: `${stats.target_ratio.women}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="d-flex justify-content-between mb-2">
                          <span>Hommes</span>
                          <span className="fw-bold">{stats.target_ratio.men}%</span>
                        </div>
                        <div className="progress" style={{ height: "10px" }}>
                          <div className="progress-bar bg-primary" style={{ width: `${stats.target_ratio.men}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted text-center py-4">Ratio cible non défini</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Panel - Waitlist Entries (only visible when logged in) */}
      {isAuthorized && (
        <section className="py-5 bg-white">
          <div className="container px-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h3 fw-bold mb-0">
                <FaUserGraduate className="text-primary me-2" />
                Gestion des inscriptions
              </h2>
              <span className="badge bg-secondary rounded-pill px-3 py-2">
                {entries.length} en attente sur {totalWaiting} total
              </span>
            </div>

            {entries.length === 0 ? (
              <div className="alert alert-warning text-center">
                <FaExclamationTriangle className="me-2" />
                Aucune inscription en attente
                {totalWaiting > 0 && (
                  <div className="mt-2">
                    <small>Les statistiques indiquent {totalWaiting} personne(s) en attente mais la liste est vide.</small>
                  </div>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Prénom</th>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Genre</th>
                      <th>Position</th>
                      <th>Inscrit le</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>#{entry.id}</td>
                        <td>{entry.first_name}</td>
                        <td>{entry.last_name}</td>
                        <td>{entry.email}</td>
                        <td>
                          <span className={`badge ${entry.gender === 'female' ? 'bg-danger' : 'bg-primary'}`}>
                            {entry.gender === 'female' ? 'Femme' : 'Homme'}
                          </span>
                        </td>
                        <td>#{entry.position}</td>
                        <td>{new Date(entry.joined_at).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              onClick={() => handleAccept(entry.id)}
                              className="btn btn-success btn-sm"
                            >
                              <FaCheck /> Accepter
                            </button>
                            <button
                              onClick={() => handleReject(entry.id)}
                              className="btn btn-danger btn-sm"
                            >
                              <FaTimes /> Refuser
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      <style>
        {`
          .hover-lift {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .hover-lift:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
          }
          .bg-gradient-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </div>
  );
}