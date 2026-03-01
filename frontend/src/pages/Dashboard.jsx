import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";

import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [slideDirection, setSlideDirection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize ALL lists as empty arrays
  const [likesList, setLikesList] = useState([]);
  const [matchesList, setMatchesList] = useState([]);
  const [blockedList, setBlockedList] = useState([]);

  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [selectedLike, setSelectedLike] = useState(null);

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);

  // Fetch authenticated user on mount
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/users/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
          return;
        }

        const data = await response.json();
        console.log("✅ Current authenticated user:", data);
        setUser(data);
      } catch (error) {
        console.error("Error fetching user:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const getProfilePhotoUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150";
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

  // Shuffle array function for random ordering
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch REAL profiles from database based on user's interests
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token || !user) return;

    const fetchProfiles = async () => {
      setProfilesLoading(true);
      setApiError(null);
      
      try {
        // Determine gender filter based on user's interests
        let genderFilter = '';
        if (user.interested_in === 'male') {
          genderFilter = 'male';
          console.log("🔍 User is interested in males, fetching male profiles");
        } else if (user.interested_in === 'female') {
          genderFilter = 'female';
          console.log("🔍 User is interested in females, fetching female profiles");
        } else if (user.interested_in === 'everyone') {
          console.log("🔍 User is interested in everyone, fetching all profiles");
        }

        const queryParams = new URLSearchParams();
        if (genderFilter) {
          queryParams.append('gender', genderFilter);
        }
        
        const apiUrl = `http://127.0.0.1:8000/api/users/profiles/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        console.log("🔍 Fetching profiles from:", apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("🔍 Raw API Response:", data);

        // Handle different response formats
        let profilesArray = [];
        
        if (Array.isArray(data)) {
          profilesArray = data;
          console.log("🔍 API returned direct array with", profilesArray.length, "profiles");
        } else if (data.results && Array.isArray(data.results)) {
          profilesArray = data.results;
          console.log("🔍 API returned paginated results with", profilesArray.length, "profiles");
        }

        // LAYER 1 FILTER: Remove the current user by ID (ABSOLUTE MUST)
        console.log("🔍 Current user ID to filter out:", user.id);
        
        const filteredById = profilesArray.filter(profile => {
          // NEVER show the current user - this is non-negotiable
          if (profile.id === user.id) {
            console.log(`🚨 LAYER 1: Removed current user: ${profile.username} (ID: ${profile.id})`);
            return false;
          }
          return true;
        });

        console.log(`🔍 After Layer 1 filter: ${filteredById.length} profiles remain`);

        // LAYER 2 FILTER: Ensure gender matches if we have a filter
        let finalProfiles = filteredById;
        if (genderFilter) {
          finalProfiles = filteredById.filter(profile => {
            if (profile.gender !== genderFilter) {
              console.log(`🚨 LAYER 2: Removed ${profile.username} because gender ${profile.gender} != ${genderFilter}`);
              return false;
            }
            return true;
          });
        }

        console.log(`🔍 After Layer 2 filter: ${finalProfiles.length} profiles remain`);
        
        if (finalProfiles.length > 0) {
          console.log("✅ FINAL PROFILES:");
          finalProfiles.forEach(p => console.log(`  - ID: ${p.id}, Name: ${p.username}, Gender: ${p.gender}`));
        } else {
          console.log("⚠️ No profiles left after all filters");
        }

        // Transform the profiles
        const transformedProfiles = finalProfiles.map(profile => ({
          id: profile.id,
          name: profile.username,
          age: profile.age || calculateAge(profile.birth_date),
          bio: profile.bio || "No bio yet",
          photo: getProfilePhotoUrl(profile.profile_photo),
          location: profile.location || "Location not specified",
          gender: profile.gender,
          interested_in: profile.interested_in,
          height: profile.height,
          passions: profile.passions,
          career: profile.career,
          education: profile.education,
          hobbies: profile.hobbies,
          favorite_music: profile.favorite_music,
          birth_date: profile.birth_date,
        }));

        // Shuffle for random order
        const shuffledProfiles = shuffleArray(transformedProfiles);
        
        setProfiles(shuffledProfiles);
        setProfileIndex(0);

      } catch (error) {
        console.error("Error fetching profiles:", error);
        setApiError(error.message);
        setProfiles([]);
      } finally {
        setProfilesLoading(false);
      }
    };

    if (user) {
      fetchProfiles();
    }
  }, [user]);

  const currentProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    if (profileIndex >= profiles.length) return null;
    
    // LAYER 3 FILTER: Emergency check in case any current user slipped through
    if (user && profiles[profileIndex] && profiles[profileIndex].id === user.id) {
      console.log(`🚨🚨🚨 EMERGENCY: Found current user in profiles at index ${profileIndex}! Skipping...`);
      // Automatically skip to next profile
      setTimeout(() => goNextProfile(), 0);
      return null;
    }
    
    return profiles[profileIndex];
  }, [profiles, profileIndex, user]);

  const goNextProfile = () => {
    if (profileIndex < profiles.length - 1) {
      setProfileIndex((prev) => prev + 1);
    } else {
      // No more profiles - set index to length to show "No more profiles" message
      setProfileIndex(profiles.length);
    }
  };

  const triggerSlide = (direction) => {
    if (isAnimating) return;
    setSlideDirection(direction);
    setIsAnimating(true);

    setTimeout(() => {
      goNextProfile();
      setSlideDirection(null);
      setIsAnimating(false);
    }, 300);
  };

  const existsById = (arr, id) => arr.some((x) => x.id === id);

  const addToMatches = (profile) => {
    setMatchesList((prev) => (existsById(prev, profile.id) ? prev : [profile, ...prev]));
  };

  const addToBlocked = (profile) => {
    setBlockedList((prev) => (existsById(prev, profile.id) ? prev : [profile, ...prev]));
  };

  const removeFromMatches = (id) => {
    setMatchesList((prev) => prev.filter((x) => x.id !== id));
  };

  const removeFromLikes = (id) => {
    setLikesList((prev) => prev.filter((x) => x.id !== id));
  };

  const removeFromDiscover = (id) => {
    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;

      const next = prev.filter((p) => p.id !== id);

      setProfileIndex((pi) => {
        if (pi > idx) return pi - 1;
        if (pi === idx) return pi;
        return pi;
      });

      return next;
    });
  };

  const handlePass = () => triggerSlide("left");
  
  const handleLike = () => {
    if (currentProfile) {
      console.log("Liked profile:", currentProfile.id, currentProfile.name);
      // TODO: Send like to backend when ready
    }
    triggerSlide("right");
  };

  const openLikeModal = (p) => {
    setSelectedLike(p);
    setLikeModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLikeModal = () => {
    setLikeModalOpen(false);
    setSelectedLike(null);
    document.body.style.overflow = 'unset';
  };

  const handlePassFromLikeModal = () => {
    closeLikeModal();
  };

  const handleLikeBack = () => {
    if (!selectedLike) return;

    addToMatches(selectedLike);
    setMatchedProfile(selectedLike);
    setMatchModalOpen(true);
    closeLikeModal();
  };

  const openMatchModalFor = (p) => {
    setMatchedProfile(p);
    setMatchModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeMatchModal = () => {
    setMatchModalOpen(false);
    setMatchedProfile(null);
    document.body.style.overflow = 'unset';
  };

  const handleUnmatch = () => {
    if (!matchedProfile) return;
    removeFromMatches(matchedProfile.id);
    closeMatchModal();
  };

  const handleBlock = () => {
    if (!matchedProfile) return;

    removeFromMatches(matchedProfile.id);
    removeFromLikes(matchedProfile.id);
    removeFromDiscover(matchedProfile.id);

    addToBlocked(matchedProfile);
    closeMatchModal();
  };

  const centerCardStyle = {
    borderRadius: "24px",
    transition: "transform 0.3s ease, opacity 0.3s ease",
    transform:
      slideDirection === "left"
        ? "translateX(-100%) rotate(-8deg)"
        : slideDirection === "right"
        ? "translateX(100%) rotate(8deg)"
        : "translateX(0)",
    opacity: slideDirection ? 0 : 1,
  };

  const ModalShell = ({ open, onClose, title, children, maxWidth = 520, overlay = "rgba(0,0,0,0.60)" }) => {
    if (!open) return null;

    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            background: overlay,
            zIndex: 999999,
            backdropFilter: "blur(4px)",
            margin: 0,
            padding: 0,
          }}
        />

        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            zIndex: 1000000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: 0,
            padding: "16px",
            pointerEvents: "none",
          }}
        >
          <div
            className="card shadow-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth,
              borderRadius: 28,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "#ffffff",
              animation: "modalFadeIn 0.2s ease-out",
              pointerEvents: "auto",
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              margin: 0,
            }}
          >
            <div className="p-4 d-flex align-items-center justify-content-between border-bottom">
              <div className="fw-bold fs-5">{title}</div>

              <button
                className="btn rounded-circle d-flex align-items-center justify-content-center"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 40,
                  height: 40,
                  background: "rgba(0,0,0,0.04)",
                  border: "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
              >
                <i className="fas fa-times" style={{ color: "#111", fontSize: "1.1rem" }} />
              </button>
            </div>

            <div className="p-4">{children}</div>
          </div>
        </div>
      </>
    );
  };

  const AvatarRow = ({ items, onClickAvatar }) => (
    <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
      {items.slice(0, 8).map((p) => (
        <button
          key={p.id}
          type="button"
          className="p-0 border-0 bg-transparent"
          onClick={() => onClickAvatar?.(p)}
          style={{ lineHeight: 0 }}
          aria-label="Open profile"
        >
          <div className="position-relative">
            <img
              src={p.photo}
              alt={p.name || ""}
              className="rounded-circle"
              width="42"
              height="42"
              style={{
                objectFit: "cover",
                border: "2px solid #fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                cursor: onClickAvatar ? "pointer" : "default",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            />
            {onClickAvatar && (
              <div className="position-absolute bottom-0 end-0 bg-primary rounded-circle p-1" style={{ width: 8, height: 8 }} />
            )}
          </div>
        </button>
      ))}

      {items.length > 8 && (
        <span className="badge bg-light text-dark rounded-pill px-3 py-2" style={{ fontSize: "0.85rem" }}>
          +{items.length - 8}
        </span>
      )}
    </div>
  );

  const SectionCard = ({ title, count, children }) => (
    <div
      className="p-3 mt-3"
      style={{
        borderRadius: "20px",
        background: "linear-gradient(145deg, #ffffff, #f8f9fa)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-semibold" style={{ fontSize: "0.95rem", color: "#2c3e50" }}>{title}</span>
        <span className="badge rounded-pill" style={{ background: "#e9ecef", color: "#495057", padding: "6px 12px" }}>{count}</span>
      </div>
      {children}
    </div>
  );

  const RoundActionBtn = ({ onClick, bg, border, icon, iconColor, label }) => (
    <button
      type="button"
      className="btn rounded-circle shadow-sm d-flex align-items-center justify-content-center round-action-btn position-relative"
      onClick={onClick}
      style={{
        width: 64,
        height: 64,
        background: bg,
        border: border || "none",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      }}
      aria-label={label}
    >
      <i className={icon} style={{ color: iconColor, fontSize: "1.3rem" }} />
      <span className="round-tooltip">{label}</span>
    </button>
  );

  return (
    <>
      <DashboardNavbar user={user} />

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f5f7fb;
            margin: 0;
            padding: 0;
          }
          
          .round-action-btn .round-tooltip{
            position: absolute;
            left: 50%;
            bottom: calc(100% + 12px);
            transform: translateX(-50%) translateY(6px);
            background: #1a1a1a;
            color: #fff;
            font-size: 12px;
            font-weight: 500;
            padding: 6px 12px;
            border-radius: 20px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 160ms ease, transform 160ms ease;
            box-shadow: 0 10px 22px rgba(0,0,0,0.25);
            z-index: 5;
          }
          .round-action-btn .round-tooltip::after{
            content: "";
            position: absolute;
            left: 50%;
            top: 100%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid #1a1a1a;
          }
          .round-action-btn:hover .round-tooltip{
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }

          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @keyframes modalFadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          .profile-card {
            transition: all 0.3s ease;
          }
          
          .profile-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 30px rgba(0,0,0,0.1) !important;
          }

          .text-truncate-custom {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          }
        `}
      </style>

      <div className="container py-4" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : user ? (
          <div className="row g-4">
            {/* LEFT BLOCK - User Profile & Lists */}
            <div className="col-lg-3 col-md-4 order-2 order-md-1">
              <div
                className="card profile-card shadow-sm h-100 p-4"
                style={{
                  borderRadius: "28px",
                  border: "none",
                  background: "#ffffff",
                }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div className="position-relative flex-shrink-0">
                    <img
                      src={getProfilePhotoUrl(user.profile_photo)}
                      alt="profile"
                      className="rounded-circle shadow-sm"
                      width="70"
                      height="70"
                      style={{ objectFit: "cover", border: "3px solid #fff" }}
                    />
                    <div className="position-absolute bottom-0 end-0 bg-success rounded-circle p-2" style={{ width: 14, height: 14, border: "2px solid #fff" }} />
                  </div>
                  <div className="text-start flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="fw-bold fs-5 text-truncate-custom">{user.username}</div>
                    <div className="small text-secondary text-truncate-custom" title={user.email}>{user.email}</div>
                  </div>
                </div>

                <div className="mt-4" style={{ height: 1, background: "linear-gradient(90deg, transparent, #e9ecef, transparent)" }} />

                <SectionCard title="Likes You" count={likesList.length}>
                  {likesList.length > 0 ? (
                    <AvatarRow items={likesList} onClickAvatar={openLikeModal} />
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-secondary small">
                        <i className="far fa-heart me-2" style={{ opacity: 0.5, fontSize: "1.2rem" }}></i>
                        <div>No likes yet</div>
                        <div className="mt-1" style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                          When someone likes you, they'll appear here
                        </div>
                      </div>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Matches" count={matchesList.length}>
                  {matchesList.length > 0 ? (
                    <AvatarRow items={matchesList} onClickAvatar={openMatchModalFor} />
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-secondary small">
                        <i className="fas fa-heart me-2" style={{ opacity: 0.5, fontSize: "1.2rem" }}></i>
                        <div>No matches yet</div>
                        <div className="mt-1" style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                          Start liking profiles to get matches
                        </div>
                      </div>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Blocked" count={blockedList.length}>
                  {blockedList.length > 0 ? (
                    <AvatarRow items={blockedList} />
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-secondary small">
                        <i className="fas fa-ban me-2" style={{ opacity: 0.5, fontSize: "1.2rem" }}></i>
                        <div>No blocked users</div>
                      </div>
                    </div>
                  )}
                </SectionCard>
              </div>
            </div>

            {/* CENTER BLOCK - Main Swipe Card */}
            <div className="col-lg-6 col-md-8 order-1 order-md-2">
              <div className="card shadow-lg h-100 overflow-hidden" style={centerCardStyle}>
                {profilesLoading ? (
                  <div className="p-5 text-center" style={{ minHeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div>
                      <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
                      <div className="text-secondary">Loading people you might like...</div>
                    </div>
                  </div>
                ) : apiError ? (
                  <div className="p-5 text-center" style={{ minHeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div>
                      <div className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10" style={{ width: 80, height: 80 }}>
                        <i className="fas fa-exclamation-triangle text-danger" style={{ fontSize: "2rem" }} />
                      </div>
                      <h5 className="fw-bold mb-2">Error Loading Profiles</h5>
                      <p className="text-secondary mb-3">{apiError}</p>
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => window.location.reload()}
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : profiles.length > 0 && profileIndex < profiles.length ? (
                  <>
                    <div className="position-relative">
                      <img
                        src={currentProfile.photo}
                        alt={currentProfile.name}
                        className="w-100"
                        style={{ 
                          height: "420px", 
                          objectFit: "cover",
                          objectPosition: "top center"
                        }}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/400x500?text=No+Photo";
                        }}
                      />
                      <div className="position-absolute bottom-0 start-0 end-0 p-4" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                        <h2 className="text-white fw-bold mb-0">
                          {currentProfile.name}<span className="fw-light ms-2">{currentProfile.age}</span>
                        </h2>
                      </div>
                    </div>

                    <div className="p-4">
                      <p className="text-secondary mb-4" style={{ fontSize: "1.1rem", lineHeight: 1.6 }}>{currentProfile.bio}</p>

                      <div className="d-flex justify-content-center gap-4 mt-4">
                        <button
                          onClick={handlePass}
                          disabled={isAnimating}
                          className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
                          style={{
                            width: "70px",
                            height: "70px",
                            background: "#ffffff",
                            border: "1px solid #e9ecef",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f8f9fa";
                            e.currentTarget.style.transform = "scale(1.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#ffffff";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          aria-label="Pass"
                        >
                          <i className="fas fa-times" style={{ color: "#adb5bd", fontSize: "1.5rem" }} />
                        </button>

                        <button
                          onClick={handleLike}
                          disabled={isAnimating}
                          className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
                          style={{
                            width: "84px",
                            height: "84px",
                            background: "linear-gradient(145deg, #ff4d6d, #ff3355)",
                            border: "none",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.08)";
                            e.currentTarget.style.boxShadow = "0 10px 25px rgba(255,77,109,0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(255,77,109,0.3)";
                          }}
                          aria-label="Like"
                        >
                          <i className="fas fa-heart" style={{ color: "#ffffff", fontSize: "1.8rem" }} />
                        </button>

                        <button
                          onClick={() => navigate(`/profile/${currentProfile.id}`)}
                          disabled={isAnimating}
                          className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
                          style={{
                            width: "70px",
                            height: "70px",
                            background: "#ffffff",
                            border: "1px solid #e9ecef",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f8f9fa";
                            e.currentTarget.style.transform = "scale(1.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#ffffff";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          aria-label="View Profile"
                        >
                          <i className="fas fa-user" style={{ color: "#6f42c1", fontSize: "1.3rem" }} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* "No more profiles" message - RESTORED! */
                  <div className="p-5 text-center" style={{ minHeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div>
                      <div
                        className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle"
                        style={{ width: 100, height: 100, background: "rgba(255,77,109,0.1)" }}
                      >
                        <i className="fas fa-heart" style={{ color: "#ff4d6d", fontSize: "2.5rem" }} />
                      </div>

                      <h4 className="fw-bold mb-2">No more profiles</h4>
                      <p className="text-secondary mb-4">Check back later for new people!</p>

                      <button
                        className="btn btn-primary rounded-pill px-5 py-2"
                        onClick={() => {
                          window.location.reload();
                        }}
                        style={{ background: "#ff4d6d", border: "none" }}
                      >
                        Refresh Profiles
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT BLOCK - Current Profile Details */}
            <div className="col-lg-3 d-none d-lg-block order-3">
              <div
                className="card profile-card shadow-sm h-100 p-4"
                style={{
                  borderRadius: "28px",
                  border: "none",
                  background: "#ffffff",
                }}
              >
                {currentProfile ? (
                  <>
                    <div className="d-flex align-items-center gap-3 mb-4">
                      <img
                        src={currentProfile.photo}
                        alt={currentProfile.name}
                        className="rounded-circle shadow-sm"
                        width="60"
                        height="60"
                        style={{ objectFit: "cover", border: "3px solid #fff" }}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/60";
                        }}
                      />
                      <div>
                        <h5 className="fw-bold mb-1">{currentProfile.name}, {currentProfile.age}</h5>
                        <div className="small text-secondary">
                          <i className="fas fa-map-marker-alt me-1" style={{ fontSize: "0.8rem" }} />
                          {currentProfile.location}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="fw-semibold mb-3" style={{ color: "#495057", fontSize: "0.9rem", letterSpacing: "0.5px" }}>
                        <i className="fas fa-info-circle me-2" />BASIC INFO
                      </h6>
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-venus-mars text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">
                            {currentProfile.gender ? currentProfile.gender.charAt(0).toUpperCase() + currentProfile.gender.slice(1) : "—"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-heart text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">
                            Interested in: {currentProfile.interested_in ? currentProfile.interested_in.charAt(0).toUpperCase() + currentProfile.interested_in.slice(1) : "—"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-cake-candles text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">
                            {currentProfile.birth_date ? calculateAge(currentProfile.birth_date) + " years old" : "—"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-ruler text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">
                            {currentProfile.height ? `${currentProfile.height} cm` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="fw-semibold mb-3" style={{ color: "#495057", fontSize: "0.9rem", letterSpacing: "0.5px" }}>
                        <i className="fas fa-briefcase me-2" />PROFESSION
                      </h6>
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-briefcase text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">{currentProfile.career || "—"}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-graduation-cap text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">{currentProfile.education || "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="fw-semibold mb-3" style={{ color: "#495057", fontSize: "0.9rem", letterSpacing: "0.5px" }}>
                        <i className="fas fa-heart me-2" />PASSIONS & HOBBIES
                      </h6>
                      <div className="d-flex flex-column gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-fire text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom" title={currentProfile.passions}>
                            {currentProfile.passions || "—"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-pencil text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom" title={currentProfile.hobbies}>
                            {currentProfile.hobbies || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h6 className="fw-semibold mb-3" style={{ color: "#495057", fontSize: "0.9rem", letterSpacing: "0.5px" }}>
                        <i className="fas fa-music me-2" />MUSIC
                      </h6>
                      <div className="d-flex align-items-center gap-2">
                        <i className="fas fa-headphones text-secondary flex-shrink-0" style={{ width: 20 }} />
                        <span className="text-secondary small text-truncate-custom" title={currentProfile.favorite_music}>
                          {currentProfile.favorite_music || "—"}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-light" style={{ width: 60, height: 60 }}>
                      <i className="fas fa-user-slash text-secondary" style={{ fontSize: "1.5rem" }} />
                    </div>
                    <p className="text-secondary small">No profile selected</p>
                  </div>
                )}
              </div>
            </div>

            {/* ===== Likes Modal ===== */}
            <ModalShell
              open={likeModalOpen}
              onClose={closeLikeModal}
              title={selectedLike ? `${selectedLike.name}, ${selectedLike.age}` : "Profile"}
              overlay="rgba(0,0,0,0.60)"
            >
              {selectedLike && (
                <>
                  <div className="rounded-4 overflow-hidden shadow-sm mb-4">
                    <img 
                      src={selectedLike.photo} 
                      alt={selectedLike.name} 
                      className="w-100" 
                      style={{ height: 360, objectFit: "cover" }}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/400x500?text=No+Photo";
                      }}
                    />
                  </div>

                  <p className="text-secondary mb-4" style={{ fontSize: "1rem", lineHeight: 1.6 }}>{selectedLike.bio}</p>

                  <div className="d-flex justify-content-center gap-3">
                    <RoundActionBtn
                      onClick={handlePassFromLikeModal}
                      bg="#ffffff"
                      border="1px solid #e9ecef"
                      icon="fas fa-times"
                      iconColor="#adb5bd"
                      label="Pass"
                    />
                    <RoundActionBtn
                      onClick={handleLikeBack}
                      bg="linear-gradient(145deg, #ff4d6d, #ff3355)"
                      border="none"
                      icon="fas fa-heart"
                      iconColor="#ffffff"
                      label="Like back"
                    />
                    <RoundActionBtn
                      onClick={() => navigate(`/profile/${selectedLike.id}`)}
                      bg="#ffffff"
                      border="1px solid #e9ecef"
                      icon="fas fa-user"
                      iconColor="#6f42c1"
                      label="See profile"
                    />
                  </div>
                </>
              )}
            </ModalShell>

            {/* ===== It's a Match Modal ===== */}
            <ModalShell
              open={matchModalOpen}
              onClose={closeMatchModal}
              title=""
              maxWidth={640}
              overlay="rgba(0,0,0,0.60)"
            >
              {matchedProfile && (
                <>
                  <div
                    className="text-center p-4 position-relative rounded-4 mb-4"
                    style={{
                      background: "linear-gradient(145deg, #fff5f7, #fff)",
                    }}
                  >
                    <div
                      className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle shadow"
                      style={{
                        width: 100,
                        height: 100,
                        background: "linear-gradient(145deg, #ff4d6d20, #ff4d6d10)",
                        border: "3px solid #ff4d6d30",
                        animation: "pulse 1.8s infinite",
                      }}
                    >
                      <i className="fas fa-heart" style={{ color: "#ff4d6d", fontSize: "2.5rem" }} />
                    </div>

                    <h2 className="fw-bold mb-2" style={{ fontSize: "2.5rem", background: "linear-gradient(145deg, #ff4d6d, #ff3355)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      It's a Match!
                    </h2>

                    <p className="text-secondary mb-4">
                      You and <span className="fw-semibold text-dark">{matchedProfile.name}</span> liked each other
                    </p>

                    <div className="d-flex align-items-center justify-content-center gap-4 mb-4">
                      <img 
                        src={matchedProfile.photo} 
                        alt={matchedProfile.name} 
                        className="rounded-circle shadow" 
                        width="100" 
                        height="100" 
                        style={{ objectFit: "cover", border: "4px solid #fff" }}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/100";
                        }}
                      />
                      <div className="text-start" style={{ minWidth: 0 }}>
                        <h4 className="fw-bold mb-1 text-truncate-custom">{matchedProfile.name}, {matchedProfile.age}</h4>
                        <p className="text-secondary mb-0 text-truncate-custom" style={{ maxWidth: 300 }} title={matchedProfile.bio}>{matchedProfile.bio}</p>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <RoundActionBtn
                      onClick={() => {
                        closeMatchModal();
                        navigate(`/profile/${matchedProfile.id}`);
                      }}
                      bg="#ffffff"
                      border="1px solid #e9ecef"
                      icon="fas fa-user"
                      iconColor="#6f42c1"
                      label="See Profile"
                    />

                    <RoundActionBtn
                      onClick={() => {
                        closeMatchModal();
                        navigate(`/messages/${matchedProfile.id}`);
                      }}
                      bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
                      border="none"
                      icon="fas fa-comment-dots"
                      iconColor="#ffffff"
                      label="Send Message"
                    />

                    <RoundActionBtn
                      onClick={handleUnmatch}
                      bg="#ffffff"
                      border="1px solid #dc354530"
                      icon="fas fa-heart-broken"
                      iconColor="#dc3545"
                      label="Unmatch"
                    />

                    <RoundActionBtn
                      onClick={handleBlock}
                      bg="#1a1a1a"
                      border="none"
                      icon="fas fa-ban"
                      iconColor="#ffffff"
                      label="Block"
                    />
                  </div>

                  <p className="text-center text-secondary small mt-3 mb-0">
                    What would you like to do next?
                  </p>
                </>
              )}
            </ModalShell>
          </div>
        ) : (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
            <p className="text-secondary">Unable to load user data.</p>
          </div>
        )}
      </div>
    </>
  );
}