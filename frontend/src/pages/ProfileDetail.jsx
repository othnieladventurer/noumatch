import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function ProfileDetail() {
  const navigate = useNavigate();
  const { id } = useParams(); // Get profile ID from URL
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Relationship status
  const [isLiked, setIsLiked] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [matchId, setMatchId] = useState(null);
  
  // Photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  // Fetch current user and profile data
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch current user
        const userResponse = await fetch("http://127.0.0.1:8000/api/users/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userResponse.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
          return;
        }

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user data");
        }

        const userData = await userResponse.json();
        setUser(userData);

        // Fetch profile details
        const profileResponse = await fetch(`http://127.0.0.1:8000/api/users/profiles/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!profileResponse.ok) {
          throw new Error("Failed to fetch profile");
        }

        const profileData = await profileResponse.json();
        setProfile(profileData);

        // Check relationship status
        await checkRelationshipStatus(id, token);

      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const checkRelationshipStatus = async (profileId, token) => {
    try {
      // Check if liked
      const likesResponse = await fetch("http://127.0.0.1:8000/api/interactions/likes/sent/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (likesResponse.ok) {
        const likesData = await likesResponse.json();
        const liked = likesData.some(like => like.to_user.id === parseInt(profileId));
        setIsLiked(liked);
      }

      // Check if matched
      const matchesResponse = await fetch("http://127.0.0.1:8000/api/matches/matches/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        const match = matchesData.find(m => 
          (m.user1.id === parseInt(profileId) || m.user2.id === parseInt(profileId))
        );
        
        if (match) {
          setIsMatched(true);
          setMatchId(match.id);
        }
      }

      // Check if blocked
      const blocksResponse = await fetch("http://127.0.0.1:8000/api/blocked/blocks/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (blocksResponse.ok) {
        const blocksData = await blocksResponse.json();
        const blocked = blocksData.some(block => block.blocked === parseInt(profileId));
        setIsBlocked(blocked);
      }

    } catch (error) {
      console.error("Error checking relationship:", error);
    }
  };

  const getProfilePhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/media')) return `http://127.0.0.1:8000${path}`;
    return `http://127.0.0.1:8000${path}`;
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatName = (profile) => {
    if (!profile) return "";
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile.first_name) return profile.first_name;
    if (profile.last_name) return profile.last_name;
    return "";
  };

  const handleLike = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/like/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to_user_id: profile.id }),
      });

      if (response.ok) {
        setIsLiked(true);
        // Check for match
        await checkForMatch();
      }
    } catch (error) {
      console.error("Error liking profile:", error);
    }
  };

  const handleUnlike = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/interactions/unlike/${profile.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setIsLiked(false);
        if (isMatched) {
          setIsMatched(false);
          setMatchId(null);
        }
      }
    } catch (error) {
      console.error("Error unliking profile:", error);
    }
  };

  const handleUnmatch = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/matches/unmatch/${matchId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setIsMatched(false);
        setMatchId(null);
      }
    } catch (error) {
      console.error("Error unmatching:", error);
    }
  };

  const handleBlock = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/blocked/blocks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blocked: profile.id }),
      });

      if (response.ok) {
        setIsBlocked(true);
        // Optionally navigate back
        navigate(-1);
      }
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const handleUnblock = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/blocked/blocks/${profile.id}/unblock/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setIsBlocked(false);
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
    }
  };

  const checkForMatch = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/matches/match/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user1_id: user.id,
          user2_id: profile.id,
        }),
      });

      const data = await response.json();
      if (response.status === 201 || response.status === 200) {
        setIsMatched(true);
        setMatchId(data.id);
      }
    } catch (error) {
      console.error("Error creating match:", error);
    }
  };

  const goBack = () => {
    navigate(-1); // Go back to previous page
  };

  const openPhotoModal = () => {
    setPhotoModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    document.body.style.overflow = 'unset';
  };

  const PhotoModal = () => {
    if (!photoModalOpen) return null;

    return (
      <>
        <div
          onClick={closePhotoModal}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 999999,
            backdropFilter: "blur(8px)",
            cursor: "pointer",
          }}
        />
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            pointerEvents: "none",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              position: "relative",
              pointerEvents: "auto",
            }}
          >
            <button
              onClick={closePhotoModal}
              style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                background: "white",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                fontSize: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                zIndex: 1000001,
              }}
            >
              <i className="fas fa-times"></i>
            </button>
            <img
              src={getProfilePhotoUrl(profile?.profile_photo) || "https://via.placeholder.com/800"}
              alt={formatName(profile)}
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
              }}
            />
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <>
        <DashboardNavbar user={user} />
        <div className="container py-5 text-center">
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <DashboardNavbar user={user} />
        <div className="container py-5 text-center">
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error || "Profile not found"}
          </div>
          <button className="btn btn-danger mt-3 px-5 py-2" onClick={goBack} style={{ borderRadius: "50px" }}>
            <i className="fas fa-arrow-left me-2"></i>
            Go Back
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar user={user} />
      <PhotoModal />
      
      <style>
        {`
          /* Enable page scrolling */
          html, body {
            overflow-y: auto !important;
            height: auto !important;
            min-height: 100vh;
          }
          
          .profile-detail-page {
            min-height: 100vh;
            padding-bottom: 2rem;
            background: #f8f9fa;
          }
          
          .profile-detail-header {
            background: linear-gradient(135deg, #ff4d6d 0%, #ff8fa3 100%);
            color: white;
            padding: 1.5rem 0 9rem 0;
            margin-bottom: -7rem;
            position: relative;
          }
          
          .profile-detail-card {
            border-radius: 30px;
            border: none;
            box-shadow: 0 20px 50px rgba(255, 77, 109, 0.15);
            margin-top: -7rem;
            background: white;
            position: relative;
            z-index: 10;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
            margin-bottom: 2rem;
          }
          
          .profile-photo-container {
            position: relative;
            display: inline-block;
            cursor: pointer;
            margin-top: -100px;
          }
          
          .profile-detail-photo {
            width: 240px;
            height: 240px;
            border-radius: 50%;
            border: 8px solid white;
            box-shadow: 0 15px 40px rgba(255, 77, 109, 0.3);
            object-fit: cover;
            transition: transform 0.3s;
          }
          
          .profile-detail-photo:hover {
            transform: scale(1.05);
          }
          
          .photo-zoom-overlay {
            position: absolute;
            bottom: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ff4d6d;
            font-size: 1.3rem;
            box-shadow: 0 4px 15px rgba(255, 77, 109, 0.3);
            transition: all 0.3s;
            border: 3px solid white;
          }
          
          .photo-zoom-overlay:hover {
            background: #ff4d6d;
            color: white;
            transform: scale(1.1);
          }
          
          .info-section {
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #ffe6e9;
          }
          
          .info-section:last-child {
            border-bottom: none;
          }
          
          .info-label {
            font-size: 0.8rem;
            color: #ff8fa3;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.2rem;
          }
          
          .info-value {
            font-size: 1.1rem;
            color: #2c3e50;
            font-weight: 500;
          }
          
          .info-value-empty {
            font-size: 1.1rem;
            color: #adb5bd;
            font-weight: 400;
            font-style: italic;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 18px;
            border-radius: 50px;
            font-size: 0.9rem;
            font-weight: 600;
            margin: 0 5px;
            box-shadow: 0 4px 15px rgba(255, 77, 109, 0.2);
          }
          
          .matched-badge {
            background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
            color: white;
          }
          
          .liked-badge {
            background: #6c757d;
            color: white;
          }
          
          .blocked-badge {
            background: #dc3545;
            color: white;
          }
          
          .action-btn {
            padding: 12px 30px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 1rem;
            transition: all 0.3s;
            border: none;
            box-shadow: 0 8px 20px rgba(255, 77, 109, 0.2);
          }
          
          .action-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 30px rgba(255, 77, 109, 0.3);
          }
          
          .interest-tag {
            background: #fff5f7;
            padding: 8px 18px;
            border-radius: 50px;
            color: #ff4d6d;
            font-size: 0.95rem;
            border: 1px solid #ffe6e9;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          
          .interest-tag:hover {
            background: #ff4d6d;
            color: white;
            border-color: #ff4d6d;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 77, 109, 0.3);
          }
          
          .interest-tag:hover i {
            color: white;
          }
          
          .interest-tag i {
            transition: color 0.3s;
          }
          
          .display-name {
            font-size: 2.4rem;
            font-weight: 700;
            background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
          }
          
          .back-button {
            background: rgba(255,255,255,0.2);
            border: 2px solid white;
            color: white;
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: 600;
            transition: all 0.3s;
            backdrop-filter: blur(5px);
            font-size: 0.95rem;
          }
          
          .back-button:hover {
            background: white;
            color: #ff4d6d;
            transform: translateX(-5px);
          }

          .location-text {
            color: #ff8fa3;
            font-size: 1.1rem;
          }

          .location-text i {
            color: #ff4d6d;
          }

          .bio-text {
            color: #6c757d;
            font-size: 1.1rem;
            line-height: 1.6;
            background: #fff5f7;
            padding: 1.2rem 1.5rem;
            border-radius: 20px;
            margin-top: 0.8rem;
          }

          .bio-text i {
            color: #ff4d6d;
            opacity: 0.5;
          }

          .section-title {
            color: #ff4d6d;
            font-weight: 600;
            margin-bottom: 1.2rem;
            font-size: 1.2rem;
          }

          .section-title i {
            margin-right: 8px;
          }

          .info-icon {
            color: #ff4d6d;
            margin-right: 8px;
            width: 20px;
            font-size: 1rem;
          }

          .empty-field-message {
            color: #adb5bd;
            font-style: italic;
            font-size: 1rem;
            padding: 0.5rem 0;
          }

          .verification-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 12px;
            border-radius: 50px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-left: 10px;
          }

          .verified-badge {
            background: #d4edda;
            color: #155724;
          }

          .unverified-badge {
            background: #f8d7da;
            color: #721c24;
          }

          /* Custom scrollbar styling */
          ::-webkit-scrollbar {
            width: 10px;
          }

          ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }

          ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #ff4d6d, #ff8fa3);
            border-radius: 10px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: #ff4d6d;
          }
        `}
      </style>

      {/* Main page container with scrolling */}
      <div className="profile-detail-page">
        {/* Header */}
        <div className="profile-detail-header">
          <div className="container">
            <button 
              onClick={goBack}
              className="btn back-button"
            >
              <i className="fas fa-arrow-left me-2"></i>
             
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container">
          <div className="profile-detail-card">
            {/* Profile Header with Photo */}
            <div className="text-center pt-4 px-4">
              <div className="profile-photo-container" onClick={openPhotoModal}>
                <img
                  src={getProfilePhotoUrl(profile.profile_photo) || "https://via.placeholder.com/240"}
                  alt={formatName(profile)}
                  className="profile-detail-photo"
                />
                <div className="photo-zoom-overlay">
                  <i className="fas fa-search-plus"></i>
                </div>
              </div>
              
              <div className="mt-3">
                <h1 className="display-name">
                  {formatName(profile) || "Name not set"}
                  {profile.age && <span style={{ fontSize: '1.8rem', background: 'none', WebkitTextFillColor: '#ff8fa3', marginLeft: '8px' }}>{profile.age}</span>}
                </h1>
                
                <div className="d-flex justify-content-center align-items-center flex-wrap gap-2 mb-3">
                  {profile.location ? (
                    <span className="location-text">
                      <i className="fas fa-map-marker-alt me-2"></i>
                      {profile.location}
                    </span>
                  ) : (
                    <span className="location-text" style={{ opacity: 0.5 }}>
                      <i className="fas fa-map-marker-alt me-2"></i>
                      Location not set
                    </span>
                  )}
                  
                  <div className="d-flex gap-2">
                    {isMatched && (
                      <span className="status-badge matched-badge">
                        <i className="fas fa-heart me-2"></i>Matched
                      </span>
                    )}
                    {!isMatched && isLiked && (
                      <span className="status-badge liked-badge">
                        <i className="fas fa-check me-2"></i>Liked
                      </span>
                    )}
                    {isBlocked && (
                      <span className="status-badge blocked-badge">
                        <i className="fas fa-ban me-2"></i>Blocked
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Bio - always show */}
                <div className="bio-text">
                  <i className="fas fa-quote-left me-2"></i>
                  {profile.bio || "This user hasn't added a bio yet"}
                  <i className="fas fa-quote-right ms-2"></i>
                </div>

                {/* Verification Status - New field */}
                <div className="mt-2">
                  {profile.is_verified ? (
                    <span className="verification-badge verified-badge">
                      <i className="fas fa-check-circle"></i> Verified Account
                    </span>
                  ) : (
                    <span className="verification-badge unverified-badge">
                      <i className="fas fa-clock"></i> Not Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information - All fields shown */}
            <div className="info-section">
              <h4 className="section-title">
                <i className="fas fa-info-circle"></i>
                Basic Information
              </h4>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="info-label">Full Name</div>
                  <div className={profile.first_name || profile.last_name ? "info-value" : "info-value-empty"}>
                    <i className="fas fa-user info-icon"></i>
                    {formatName(profile) || "Not specified"}
                  </div>
                </div>
                
                <div className="col-md-6 mb-3">
                  <div className="info-label">Username</div>
                  <div className={profile.username ? "info-value" : "info-value-empty"}>
                    <i className="fas fa-at info-icon"></i>
                    {profile.username || "Not specified"}
                  </div>
                </div>
                
                <div className="col-md-6 mb-3">
                  <div className="info-label">Gender</div>
                  <div className={profile.gender ? "info-value" : "info-value-empty"}>
                    <i className="fas fa-venus-mars info-icon"></i>
                    {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "Not specified"}
                  </div>
                </div>
                
                <div className="col-md-6 mb-3">
                  <div className="info-label">Interested In</div>
                  <div className={profile.interested_in ? "info-value" : "info-value-empty"}>
                    <i className="fas fa-heart info-icon"></i>
                    {profile.interested_in ? profile.interested_in.charAt(0).toUpperCase() + profile.interested_in.slice(1) : "Not specified"}
                  </div>
                </div>
                
                <div className="col-md-6 mb-3">
                  <div className="info-label">Birth Date</div>
                  <div className={profile.birth_date ? "info-value" : "info-value-empty"}>
                    <i className="fas fa-cake-candles info-icon"></i>
                    {profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Not specified"}
                  </div>
                </div>
                
                <div className="col-md-6 mb-3">
                  <div className="info-label">Height</div>
                  <div className={profile.height ? "info-value" : "info-value-empty"}>
                    <i className="fas fa-ruler info-icon"></i>
                    {profile.height ? `${profile.height} cm` : "Not specified"}
                  </div>
                </div>
                
                <div className="col-12 mb-3">
                  <div className="info-label">Location</div>
                  <div className={profile.location ? "info-value" : "info-value-empty"}>
                    <i className="fas fa-map-pin info-icon"></i>
                    {profile.location || "Not specified"}
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Information - All fields shown */}
            <div className="info-section">
              <h4 className="section-title">
                <i className="fas fa-briefcase"></i>
                Professional
              </h4>
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="info-label">Career</div>
                  <div className={profile.career ? "info-value" : "info-value-empty"}>
                    <i className="fas fa-briefcase info-icon"></i>
                    {profile.career || "Not specified"}
                  </div>
                </div>
                
                <div className="col-md-6 mb-3">
                  <div className="info-label">Education</div>
                  <div className={profile.education ? "info-value" : "info-value-empty"}>
                    <i className="fas fa-graduation-cap info-icon"></i>
                    {profile.education || "Not specified"}
                  </div>
                </div>
              </div>
            </div>

            {/* Interests & Hobbies - All fields shown */}
            <div className="info-section">
              <h4 className="section-title">
                <i className="fas fa-heart"></i>
                Interests & Hobbies
              </h4>
              
              <div className="row">
                {/* Passions */}
                <div className="col-12 mb-4">
                  <div className="info-label mb-2">Passions</div>
                  {profile.passions ? (
                    <div className="d-flex flex-wrap gap-2">
                      {profile.passions.split(',').map((passion, index) => (
                        <span key={index} className="interest-tag">
                          <i className="fas fa-fire"></i>
                          {passion.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="info-value-empty">
                      <i className="fas fa-fire info-icon"></i>
                      No passions added yet
                    </div>
                  )}
                </div>
                
                {/* Hobbies */}
                <div className="col-12 mb-4">
                  <div className="info-label mb-2">Hobbies</div>
                  {profile.hobbies ? (
                    <div className="d-flex flex-wrap gap-2">
                      {profile.hobbies.split(',').map((hobby, index) => (
                        <span key={index} className="interest-tag">
                          <i className="fas fa-pencil"></i>
                          {hobby.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="info-value-empty">
                      <i className="fas fa-pencil info-icon"></i>
                      No hobbies added yet
                    </div>
                  )}
                </div>
                
                {/* Favorite Music */}
                <div className="col-12">
                  <div className="info-label mb-2">Favorite Music</div>
                  {profile.favorite_music ? (
                    <div className="d-flex flex-wrap gap-2">
                      {profile.favorite_music.split(',').map((music, index) => (
                        <span key={index} className="interest-tag">
                          <i className="fas fa-music"></i>
                          {music.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="info-value-empty">
                      <i className="fas fa-music info-icon"></i>
                      No music preferences added yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="info-section text-center">
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                {isBlocked ? (
                  <button
                    onClick={handleUnblock}
                    className="btn btn-success action-btn"
                  >
                    <i className="fas fa-check me-2"></i>
                    Unblock User
                  </button>
                ) : (
                  <>
                    {isMatched ? (
                      <>
                        <button
                          onClick={() => navigate(`/messages/${profile.id}`)}
                          className="btn action-btn"
                          style={{ background: "linear-gradient(135deg, #6f42c1, #8a5fd1)", color: "white" }}
                        >
                          <i className="fas fa-comment-dots me-2"></i>
                          Send Message
                        </button>
                        <button
                          onClick={handleUnmatch}
                          className="btn btn-outline-danger action-btn"
                        >
                          <i className="fas fa-heart-broken me-2"></i>
                          Unmatch
                        </button>
                      </>
                    ) : isLiked ? (
                      <>
                        <button
                          onClick={handleUnlike}
                          className="btn btn-outline-secondary action-btn"
                        >
                          <i className="fas fa-times me-2"></i>
                          Unlike
                        </button>
                        <button
                          onClick={() => navigate(`/messages/${profile.id}`)}
                          className="btn action-btn"
                          style={{ background: "linear-gradient(135deg, #6f42c1, #8a5fd1)", color: "white" }}
                          disabled={!isMatched}
                        >
                          <i className="fas fa-comment-dots me-2"></i>
                          Message
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleLike}
                        className="btn action-btn"
                        style={{ background: "linear-gradient(135deg, #ff4d6d, #ff8fa3)", color: "white" }}
                      >
                        <i className="fas fa-heart me-2"></i>
                        Like Profile
                      </button>
                    )}
                    
                    <button
                      onClick={handleBlock}
                      className="btn btn-dark action-btn"
                    >
                      <i className="fas fa-ban me-2"></i>
                      Block
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}