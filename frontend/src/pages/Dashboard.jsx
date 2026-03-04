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

  // Lists
  const [likesList, setLikesList] = useState([]);
  const [sentLikesIds, setSentLikesIds] = useState([]);
  const [matchesList, setMatchesList] = useState([]);
  const [blockedList, setBlockedList] = useState([]);
  const [matchesIds, setMatchesIds] = useState([]);

  // Modals
  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [selectedLike, setSelectedLike] = useState(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);

  // Helper function to get display name - priority: first+last > username
  const getDisplayName = (profile) => {
    if (!profile) return "";
    
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    if (profile.firstName) {
      return profile.firstName;
    }
    if (profile.lastName) {
      return profile.lastName;
    }
    return profile.username || "";
  };

  // Check if user is matched with a profile
  const isMatched = (profileId) => {
    return matchesIds.includes(profileId);
  };

  // Check if user has liked a profile
  const isLiked = (profileId) => {
    return sentLikesIds.includes(profileId);
  };

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

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch likes received (people who liked me)
  const fetchLikesReceived = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/likes/received/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Received likes:", data);
        
        const likes = data.map(like => {
          let age = like.from_user.age;
          if (!age && like.from_user.birth_date) {
            age = calculateAge(like.from_user.birth_date);
          }
          
          return {
            id: like.from_user.id,
            firstName: like.from_user.first_name || "",
            lastName: like.from_user.last_name || "",
            username: like.from_user.username,
            age: age,
            bio: like.from_user.bio || "",
            photo: getProfilePhotoUrl(like.from_user.profile_photo),
            gender: like.from_user.gender,
          };
        });
        
        setLikesList(likes);
      }
    } catch (error) {
      console.error("Error fetching received likes:", error);
    }
  };

  // Fetch likes sent (people I liked)
  const fetchSentLikes = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/likes/sent/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Sent likes:", data);
        
        const likedUserIds = data.map(like => like.to_user.id);
        setSentLikesIds(likedUserIds);
      }
    } catch (error) {
      console.error("Error fetching sent likes:", error);
    }
  };

  // Fetch matches
  const fetchMatches = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/matches/matches/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Matches fetched:", data);
        
        const matches = data.map(match => {
          const otherUser = match.user1.id === user.id ? match.user2 : match.user1;
          return {
            id: otherUser.id,
            firstName: otherUser.first_name || "",
            lastName: otherUser.last_name || "",
            username: otherUser.username,
            age: otherUser.age,
            bio: otherUser.bio || "",
            photo: otherUser.profile_photo_url || getProfilePhotoUrl(otherUser.profile_photo),
            gender: otherUser.gender,
            match_id: match.id,
            created_at: match.created_at
          };
        });
        
        setMatchesList(matches);
        const matchedIdsArray = matches.map(m => m.id);
        setMatchesIds(matchedIdsArray);
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  // Create match in database
  const createMatch = async (otherUserId) => {
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
          user2_id: otherUserId
        }),
      });
      
      const data = await response.json();
      
      if (response.status === 201 || response.status === 200) {
        console.log("✅ Match created/exists:", data);
        return true;
      } else {
        console.error("Failed to create match:", data);
        return false;
      }
    } catch (error) {
      console.error("Error creating match:", error);
      return false;
    }
  };

  // Check for mutual like and create match
  const checkForMatch = async (likedUserId) => {
    const theyLikeMe = likesList.some(like => like.id === likedUserId);
    
    if (theyLikeMe) {
      console.log("🎉 Mutual like detected! Creating match...");
      
      const matchCreated = await createMatch(likedUserId);
      
      if (matchCreated) {
        await fetchMatches();
        const matchedProfile = likesList.find(like => like.id === likedUserId);
        setMatchedProfile(matchedProfile);
        setMatchModalOpen(true);
        document.body.style.overflow = 'hidden';
      }
    }
  };

  // Fetch profiles from database
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token || !user) return;

    const fetchProfiles = async () => {
      setProfilesLoading(true);
      setApiError(null);
      
      try {
        let genderFilter = '';
        if (user.interested_in === 'male') {
          genderFilter = 'male';
          console.log("🔍 Fetching male profiles");
        } else if (user.interested_in === 'female') {
          genderFilter = 'female';
          console.log("🔍 Fetching female profiles");
        } else if (user.interested_in === 'everyone') {
          console.log("🔍 Fetching all profiles");
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

        let profilesArray = [];
        if (Array.isArray(data)) {
          profilesArray = data;
        } else if (data.results && Array.isArray(data.results)) {
          profilesArray = data.results;
        }

        console.log(`📊 Raw profiles count: ${profilesArray.length}`);

        // Filter out current user
        const filteredById = profilesArray.filter(profile => profile.id !== user.id);
        console.log(`📊 After removing current user: ${filteredById.length}`);

        // Apply gender filter if needed
        let genderFilteredProfiles = filteredById;
        if (genderFilter) {
          genderFilteredProfiles = filteredById.filter(profile => profile.gender === genderFilter);
          console.log(`📊 After gender filter: ${genderFilteredProfiles.length} profiles`);
        }

        // Transform profiles
        const transformedProfiles = genderFilteredProfiles.map(profile => ({
          id: profile.id,
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          username: profile.username,
          age: profile.age || calculateAge(profile.birth_date),
          bio: profile.bio || "",
          photo: getProfilePhotoUrl(profile.profile_photo),
          location: profile.location || "",
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

  // Fetch likes and matches when user loads
  useEffect(() => {
    if (user) {
      fetchLikesReceived();
      fetchSentLikes();
      fetchMatches();
    }
  }, [user]);

  const currentProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    if (profileIndex >= profiles.length) return null;
    
    if (user && profiles[profileIndex] && profiles[profileIndex].id === user.id) {
      console.log(`🚨 Emergency: Found current user in profiles! Skipping...`);
      setTimeout(() => goNextProfile(), 0);
      return null;
    }
    
    return profiles[profileIndex];
  }, [profiles, profileIndex, user]);

  const goNextProfile = () => {
    if (profileIndex < profiles.length - 1) {
      setProfileIndex((prev) => prev + 1);
    } else {
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
    setMatchesIds((prev) => [...prev, profile.id]);
  };

  const addToBlocked = (profile) => {
    setBlockedList((prev) => (existsById(prev, profile.id) ? prev : [profile, ...prev]));
  };

  const removeFromMatches = (id) => {
    setMatchesList((prev) => prev.filter((x) => x.id !== id));
    setMatchesIds((prev) => prev.filter(mId => mId !== id));
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
  
  const handleLike = async () => {
    if (!currentProfile || isAnimating) return;
    
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/like/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          to_user_id: currentProfile.id 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Like sent successfully:", data);
        
        setSentLikesIds(prev => [...prev, currentProfile.id]);
        await checkForMatch(currentProfile.id);
        
      } else {
        const error = await response.json();
        console.error("❌ Like failed:", error);
      }
    } catch (error) {
      console.error("Error liking profile:", error);
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

  const handleLikeBack = async () => {
    if (!selectedLike) return;

    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/like/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          to_user_id: selectedLike.id 
        }),
      });

      if (response.ok) {
        console.log("✅ Liked back successfully");
        setSentLikesIds(prev => [...prev, selectedLike.id]);
        await checkForMatch(selectedLike.id);
        closeLikeModal();
      } else {
        const error = await response.json();
        console.error("❌ Like back failed:", error);
        closeLikeModal();
      }
    } catch (error) {
      console.error("Error liking back:", error);
      closeLikeModal();
    }
  };

  const openMatchModalFor = (profile) => {
    setMatchedProfile(profile);
    setMatchModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeMatchModal = () => {
    setMatchModalOpen(false);
    setMatchedProfile(null);
    document.body.style.overflow = 'unset';
  };

  const handleUnmatch = async () => {
    if (!matchedProfile) return;
    
    removeFromMatches(matchedProfile.id);
    closeMatchModal();
  };

  const handleBlock = (profile) => {
    if (!profile) return;

    removeFromMatches(profile.id);
    removeFromLikes(profile.id);
    removeFromDiscover(profile.id);

    addToBlocked(profile);
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
              src={p.photo || "https://via.placeholder.com/42"}
              alt={getDisplayName(p) || "User"}
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

          .image-container {
            background-color: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            min-height: 420px;
          }

          .image-container img {
            max-width: 100%;
            max-height: 420px;
            width: auto;
            height: auto;
            object-fit: contain;
            margin: 0 auto;
            display: block;
          }

          .modal-image-container {
            background-color: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            min-height: 360px;
            border-radius: 16px;
          }

          .modal-image-container img {
            max-width: 100%;
            max-height: 360px;
            width: auto;
            height: auto;
            object-fit: contain;
            margin: 0 auto;
            display: block;
          }

          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-left: 10px;
          }
          
          .liked-badge {
            background: #ff4d6d;
            color: white;
          }
          
          .matched-badge {
            background: #ff4d6d;
            color: white;
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
                      src={getProfilePhotoUrl(user.profile_photo) || "https://via.placeholder.com/70"}
                      alt="profile"
                      className="rounded-circle shadow-sm"
                      width="70"
                      height="70"
                      style={{ objectFit: "cover", border: "3px solid #fff" }}
                    />
                    <div className="position-absolute bottom-0 end-0 bg-success rounded-circle p-2" style={{ width: 14, height: 14, border: "2px solid #fff" }} />
                  </div>
                  <div className="text-start flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="fw-bold fs-5 text-truncate-custom">
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : user.first_name || user.last_name || user.username}
                    </div>
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
                    <div className="image-container">
                      {currentProfile.photo ? (
                        <img
                          src={currentProfile.photo}
                          alt={getDisplayName(currentProfile)}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML += '<div class="p-5 text-secondary">No photo available</div>';
                          }}
                        />
                      ) : (
                        <div className="p-5 text-secondary">No photo available</div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="d-flex align-items-center mb-2">
                        <h2 className="fw-bold mb-0">
                          {getDisplayName(currentProfile)}{currentProfile.age ? `, ${currentProfile.age}` : ''}
                        </h2>
                        {isMatched(currentProfile.id) && (
                          <span className="status-badge matched-badge">Matched</span>
                        )}
                        {!isMatched(currentProfile.id) && isLiked(currentProfile.id) && (
                          <span className="status-badge liked-badge">Liked</span>
                        )}
                      </div>
                      <p className="text-secondary mb-4" style={{ fontSize: "1.1rem", lineHeight: 1.6 }}>{currentProfile.bio || "No bio yet"}</p>

                      {isMatched(currentProfile.id) ? (
                        <div className="d-flex justify-content-center gap-3 flex-wrap mt-4">
                          {/* Pass button - always show to go to next profile */}
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

                          <RoundActionBtn
                            onClick={() => navigate(`/profile/${currentProfile.id}`)}
                            bg="#ffffff"
                            border="1px solid #e9ecef"
                            icon="fas fa-user"
                            iconColor="#6f42c1"
                            label="See Profile"
                          />

                          <RoundActionBtn
                            onClick={() => navigate(`/messages/${currentProfile.id}`)}
                            bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
                            border="none"
                            icon="fas fa-comment-dots"
                            iconColor="#ffffff"
                            label="Send Message"
                          />

                          <RoundActionBtn
                            onClick={() => {
                              setMatchedProfile(currentProfile);
                              setMatchModalOpen(true);
                            }}
                            bg="#ffffff"
                            border="1px solid #dc354530"
                            icon="fas fa-heart-broken"
                            iconColor="#dc3545"
                            label="Unmatch"
                          />

                          <RoundActionBtn
                            onClick={() => handleBlock(currentProfile)}
                            bg="#1a1a1a"
                            border="none"
                            icon="fas fa-ban"
                            iconColor="#ffffff"
                            label="Block"
                          />
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </>
                ) : (
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
                        src={currentProfile.photo || "https://via.placeholder.com/60"}
                        alt={getDisplayName(currentProfile)}
                        className="rounded-circle shadow-sm"
                        width="60"
                        height="60"
                        style={{ objectFit: "cover", border: "3px solid #fff" }}
                      />
                      <div>
                        <div className="d-flex align-items-center">
                          <h5 className="fw-bold mb-1">{getDisplayName(currentProfile)}{currentProfile.age ? `, ${currentProfile.age}` : ''}</h5>
                          {isMatched(currentProfile.id) && (
                            <span className="status-badge matched-badge" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>Matched</span>
                          )}
                          {!isMatched(currentProfile.id) && isLiked(currentProfile.id) && (
                            <span className="status-badge liked-badge" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>Liked</span>
                          )}
                        </div>
                        <div className="small text-secondary">
                          <i className="fas fa-map-marker-alt me-1" style={{ fontSize: "0.8rem" }} />
                          {currentProfile.location || "Location not specified"}
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
                            {currentProfile.gender ? currentProfile.gender.charAt(0).toUpperCase() + currentProfile.gender.slice(1) : "Not specified"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-heart text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">
                            Interested in: {currentProfile.interested_in ? currentProfile.interested_in.charAt(0).toUpperCase() + currentProfile.interested_in.slice(1) : "Not specified"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-cake-candles text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">
                            {currentProfile.birth_date ? calculateAge(currentProfile.birth_date) + " years old" : "Age not specified"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-ruler text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">
                            {currentProfile.height ? `${currentProfile.height} cm` : "Height not specified"}
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
                          <span className="text-secondary small text-truncate-custom">{currentProfile.career || "Not specified"}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-graduation-cap text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom">{currentProfile.education || "Not specified"}</span>
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
                            {currentProfile.passions || "Not specified"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-pencil text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom" title={currentProfile.hobbies}>
                            {currentProfile.hobbies || "Not specified"}
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
                          {currentProfile.favorite_music || "Not specified"}
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

            {/* Likes Modal */}
            <ModalShell
              open={likeModalOpen}
              onClose={closeLikeModal}
              title=""  // Empty title to remove name from header
              overlay="rgba(0,0,0,0.60)"
              maxWidth={480}>
              {selectedLike && (
                <>
                  <div className="modal-image-container mb-3" style={{ minHeight: "300px", maxHeight: "300px" }}>
                    {selectedLike.photo ? (
                      <img 
                        src={selectedLike.photo} 
                        alt={getDisplayName(selectedLike)}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML += '<div class="p-5 text-secondary">No photo available</div>';
                        }}
                      />
                    ) : (
                      <div className="p-5 text-secondary">No photo available</div>
                    )}
                  </div>

                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h4 className="fw-bold mb-0">{getDisplayName(selectedLike)}</h4>
                    {isMatched(selectedLike.id) && (
                      <span className="status-badge matched-badge">Matched</span>
                    )}
                  </div>

                  <p className="text-secondary mb-3" style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{selectedLike.bio || "No bio yet"}</p>

                  {isMatched(selectedLike.id) ? (
                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                      <RoundActionBtn
                        onClick={() => {
                          closeLikeModal();
                          navigate(`/profile/${selectedLike.id}`);
                        }}
                        bg="#ffffff"
                        border="1px solid #e9ecef"
                        icon="fas fa-user"
                        iconColor="#6f42c1"
                        label="See Profile"
                      />
                      <RoundActionBtn
                        onClick={() => {
                          closeLikeModal();
                          navigate(`/messages/${selectedLike.id}`);
                        }}
                        bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
                        border="none"
                        icon="fas fa-comment-dots"
                        iconColor="#ffffff"
                        label="Send Message"
                      />
                      <RoundActionBtn
                        onClick={() => {
                          setMatchedProfile(selectedLike);
                          closeLikeModal();
                          setMatchModalOpen(true);
                        }}
                        bg="#ffffff"
                        border="1px solid #dc354530"
                        icon="fas fa-heart-broken"
                        iconColor="#dc3545"
                        label="Unmatch"
                      />
                      <RoundActionBtn
                        onClick={() => {
                          handleBlock(selectedLike);
                          closeLikeModal();
                        }}
                        bg="#1a1a1a"
                        border="none"
                        icon="fas fa-ban"
                        iconColor="#ffffff"
                        label="Block"
                      />
                    </div>
                  ) : (
                    <div className="d-flex justify-content-center gap-2">
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
                  )}
                </>
              )}
            </ModalShell>


            {/* Match Modal */}
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
                      You and <span className="fw-semibold text-dark">{getDisplayName(matchedProfile)}</span> liked each other
                    </p>

                    <div className="d-flex align-items-center justify-content-center gap-4 mb-4">
                      <div style={{ width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img 
                          src={matchedProfile.photo || "https://via.placeholder.com/100"} 
                          alt={getDisplayName(matchedProfile)}
                          style={{ 
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      </div>
                      <div className="text-start" style={{ minWidth: 0 }}>
                        <h4 className="fw-bold mb-1 text-truncate-custom">{getDisplayName(matchedProfile)}{matchedProfile.age ? `, ${matchedProfile.age}` : ''}</h4>
                        <p className="text-secondary mb-0 text-truncate-custom" style={{ maxWidth: 300 }} title={matchedProfile.bio}>{matchedProfile.bio || "No bio yet"}</p>
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
                      onClick={() => handleBlock(matchedProfile)}
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