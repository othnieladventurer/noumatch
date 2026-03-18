import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import ReportModal from "../components/ReportModal"; // Import ReportModal
import API from '../api/axios'; // 👈 ADD THIS IMPORT
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function ProfileDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Relationship status
  const [isLiked, setIsLiked] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [matchId, setMatchId] = useState(null);
  
  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [userToReport, setUserToReport] = useState(null);
  
  // Photo gallery state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalPhotos, setModalPhotos] = useState([]);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Fetch user photos
  const fetchUserPhotos = async (userId) => {
    try {
      const response = await API.get(`/users/${userId}/photos/`);
      const photos = response.data.map(photo => ({
        id: photo.id,
        image: getProfilePhotoUrl(photo.image_url || photo.image),
        uploaded_at: photo.uploaded_at
      }));
      setUserPhotos(photos);
      return photos;
    } catch (error) {
      console.error("Error fetching user photos:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
      return [];
    }
  };

  // Fetch current user and profile data
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const userResponse = await API.get("/users/me/");
        const userData = userResponse.data;
        setUser(userData);

        const profileResponse = await API.get(`/users/profiles/${id}/`);
        const profileData = profileResponse.data;
        setProfile(profileData);

        // Fetch user photos
        await fetchUserPhotos(id);

        await checkRelationshipStatus(id);

      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
        } else if (error.response?.status === 404) {
          setError("Profile not found");
        } else {
          setError(error.response?.data?.message || error.message || "Failed to fetch profile");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const checkRelationshipStatus = async (profileId) => {
    try {
      const likesResponse = await API.get("/interactions/likes/sent/");
      const liked = likesResponse.data.some(like => like.to_user.id === parseInt(profileId));
      setIsLiked(liked);

      const matchesResponse = await API.get("/matches/matches/");
      const match = matchesResponse.data.find(m => 
        (m.user1.id === parseInt(profileId) || m.user2.id === parseInt(profileId))
      );
      
      if (match) {
        setIsMatched(true);
        setMatchId(match.id);
      }

      const blocksResponse = await API.get("/blocked/blocks/");
      const blocked = blocksResponse.data.some(block => block.blocked === parseInt(profileId));
      setIsBlocked(blocked);

    } catch (error) {
      console.error("Error checking relationship:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
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
      const response = await API.post("/interactions/like/", { to_user_id: profile.id });
      setIsLiked(true);
      await checkForMatch();
    } catch (error) {
      console.error("Error liking profile:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const handleUnlike = async () => {
    try {
      await API.delete(`/interactions/unlike/${profile.id}/`);
      setIsLiked(false);
      if (isMatched) {
        setIsMatched(false);
        setMatchId(null);
      }
    } catch (error) {
      console.error("Error unliking profile:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const handleUnmatch = async () => {
    try {
      await API.delete(`/matches/unmatch/${matchId}/`);
      setIsMatched(false);
      setMatchId(null);
    } catch (error) {
      console.error("Error unmatching:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const handleBlock = async () => {
    try {
      await API.post("/blocked/blocks/", { blocked: profile.id });
      setIsBlocked(true);
      navigate(-1);
    } catch (error) {
      console.error("Error blocking user:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const handleUnblock = async () => {
    try {
      await API.delete(`/blocked/blocks/${profile.id}/unblock/`);
      setIsBlocked(false);
    } catch (error) {
      console.error("Error unblocking user:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const checkForMatch = async () => {
    try {
      const response = await API.post("/matches/match/create/", {
        user1_id: user.id,
        user2_id: profile.id,
      });

      if (response.status === 201 || response.status === 200) {
        setIsMatched(true);
        setMatchId(response.data.id);
      }
    } catch (error) {
      console.error("Error creating match:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  // Report functions
  const openReportModal = () => {
    setUserToReport(profile);
    setReportModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeReportModal = () => {
    setReportModalOpen(false);
    setUserToReport(null);
    document.body.style.overflow = 'unset';
  };

  const goBack = () => {
    navigate(-1);
  };

  // Get all photos (main + gallery)
  const getAllPhotos = () => {
    const photos = [];
    
    // Add main profile photo first
    if (profile?.profile_photo) {
      photos.push({
        id: 'main',
        image: getProfilePhotoUrl(profile.profile_photo),
        is_main: true
      });
    }
    
    // Add gallery photos
    userPhotos.forEach(photo => {
      // Avoid duplicates if main photo is also in gallery
      if (photo.image !== getProfilePhotoUrl(profile?.profile_photo)) {
        photos.push(photo);
      }
    });
    
    return photos;
  };

  // Get current display photo
  const getCurrentPhoto = () => {
    const photos = getAllPhotos();
    if (photos.length === 0) return null;
    return photos[activePhotoIndex]?.image || photos[0]?.image;
  };

  // Photo navigation
  const nextPhoto = (e) => {
    e?.stopPropagation();
    const photos = getAllPhotos();
    if (photos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e) => {
    e?.stopPropagation();
    const photos = getAllPhotos();
    if (photos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Open photo modal
  const openPhotoModal = (photoUrl, index) => {
    const photos = getAllPhotos().map(p => p.image);
    setModalPhotos(photos);
    setModalPhotoIndex(index !== undefined ? index : activePhotoIndex);
    setSelectedPhoto(photoUrl || photos[activePhotoIndex]);
    setPhotoModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
    setModalPhotos([]);
    document.body.style.overflow = 'unset';
  };

  const PhotoModal = () => {
    if (!photoModalOpen) return null;

    const goToNextModalPhoto = (e) => {
      e.stopPropagation();
      if (modalPhotos.length <= 1) return;
      const nextIndex = (modalPhotoIndex + 1) % modalPhotos.length;
      setModalPhotoIndex(nextIndex);
      setSelectedPhoto(modalPhotos[nextIndex]);
    };

    const goToPrevModalPhoto = (e) => {
      e.stopPropagation();
      if (modalPhotos.length <= 1) return;
      const prevIndex = (modalPhotoIndex - 1 + modalPhotos.length) % modalPhotos.length;
      setModalPhotoIndex(prevIndex);
      setSelectedPhoto(modalPhotos[prevIndex]);
    };

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
              maxWidth: "95vw",
              maxHeight: "95vh",
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
                zIndex: 1000002,
              }}
            >
              <i className="fas fa-times"></i>
            </button>
            
            {modalPhotos.length > 1 && (
              <>
                <button
                  onClick={goToPrevModalPhoto}
                  style={{
                    position: "absolute",
                    left: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "#ff4d6d",
                    border: "none",
                    borderRadius: "50%",
                    width: "50px",
                    height: "50px",
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                    zIndex: 1000002,
                    color: "white",
                  }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button
                  onClick={goToNextModalPhoto}
                  style={{
                    position: "absolute",
                    right: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "#ff4d6d",
                    border: "none",
                    borderRadius: "50%",
                    width: "50px",
                    height: "50px",
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                    zIndex: 1000002,
                    color: "white",
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </>
            )}
            
            <div style={{
              position: "absolute",
              bottom: "-40px",
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              fontSize: "16px",
              background: "rgba(0,0,0,0.5)",
              padding: "6px 16px",
              borderRadius: "20px",
            }}>
              {modalPhotoIndex + 1} / {modalPhotos.length}
            </div>
            
            <img
              src={selectedPhoto}
              alt="Full size"
              style={{
                maxWidth: "100%",
                maxHeight: "95vh",
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
          <p className="mt-3 text-secondary">Finding your potential match...</p>
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
            <i className="fas fa-heart-broken me-2"></i>
            {error || "Profile not found"}
          </div>
          <button className="btn btn-outline-danger mt-3 px-5 py-2" onClick={goBack} style={{ borderRadius: "30px" }}>
            <i className="fas fa-arrow-left me-2"></i>
            Go Back
          </button>
        </div>
      </>
    );
  }

  const photos = getAllPhotos();
  const currentPhoto = getCurrentPhoto();

  return (
    <>
      <DashboardNavbar user={user} />
      <PhotoModal />
      <ReportModal 
        isOpen={reportModalOpen}
        onClose={closeReportModal}
        reportedUser={userToReport}
      />
      
      <style>
        {`
          /* Modern Dating App Styles - NouMatch Brand Colors */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            height: 100%;
            overflow-y: auto !important;
          }
          
          body {
            overflow-y: auto !important;
          }
          
          .profile-detail-page {
            font-family: 'Inter', sans-serif;
            background: #f5f7fb;
            min-height: 100vh;
            overflow-y: visible;
            display: block;
          }
          
          /* Photo Gallery Hero - Full image, no cropping */
          .photo-gallery {
            position: relative;
            width: 100%;
            height: 60vh;
            background: #111;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          
          .main-photo {
            width: auto;
            height: 100%;
            max-width: 100%;
            object-fit: contain;
            object-position: center;
            background-color: #111;
            transition: opacity 0.3s ease;
            cursor: pointer;
          }
          
          /* Back button integrated into photo gallery */
          .gallery-back-btn {
            position: absolute;
            top: 20px;
            left: 20px;
            z-index: 50;
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(8px);
            border: none;
            color: #ff4d6d;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          }
          
          .gallery-back-btn:hover {
            background: #ff4d6d;
            color: white;
            transform: scale(1.1);
          }
          
          /* Photo count badge */
          .photo-count {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 50;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(8px);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 0.9rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }
          
          .photo-count i {
            color: #ff4d6d;
          }
          
          .gallery-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 40px 24px 24px;
            background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
            color: white;
            z-index: 30;
          }
          
          .gallery-name {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 4px;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          
          .gallery-age {
            font-size: 1.8rem;
            font-weight: 400;
            margin-left: 10px;
            opacity: 0.9;
          }
          
          .gallery-location {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 1rem;
            opacity: 0.9;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          }
          
          /* Photo Navigation Arrows - Always visible */
          .photo-nav {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 50%;
            z-index: 40;
            display: flex;
            align-items: center;
          }
          
          .photo-nav-left {
            left: 0;
            justify-content: flex-start;
            padding-left: 20px;
          }
          
          .photo-nav-right {
            right: 0;
            justify-content: flex-end;
            padding-right: 20px;
          }
          
          .photo-nav button {
            background: #ff4d6d;
            border: none;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            color: white;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            opacity: 0.95;
          }
          
          .photo-nav button:hover {
            background: #ff3355;
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.4);
          }
          
          /* Photo Indicators */
          .photo-indicators {
            position: absolute;
            bottom: 100px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            gap: 8px;
            z-index: 35;
            padding: 0 20px;
          }
          
          .photo-indicator {
            width: 40px;
            height: 4px;
            background: rgba(255,255,255,0.4);
            border-radius: 2px;
            transition: all 0.3s;
            cursor: pointer;
          }
          
          .photo-indicator.active {
            background: #ff4d6d;
            width: 60px;
          }
          
          .photo-indicator:hover {
            background: rgba(255,255,255,0.8);
          }
          
          /* Thumbnail Strip */
          .thumbnail-strip {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
            z-index: 36;
            padding: 8px 12px;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(8px);
            border-radius: 30px;
          }
          
          .thumbnail {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            object-fit: cover;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.3s;
            opacity: 0.7;
          }
          
          .thumbnail:hover {
            opacity: 1;
            transform: scale(1.1);
          }
          
          .thumbnail.active {
            border-color: #ff4d6d;
            opacity: 1;
          }
          
          /* Profile Content Card - Now with natural height */
          .profile-content {
            max-width: 800px;
            margin: -30px auto 0;
            background: white;
            border-radius: 30px 30px 0 0;
            position: relative;
            z-index: 40;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.05);
            display: block;
          }
          
          .profile-section {
            padding: 24px;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .profile-section:last-child {
            border-bottom: none;
          }
          
          .section-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2d2d2d;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
          }
          
          .section-title i {
            color: #ff4d6d;
            margin-right: 10px;
            font-size: 1.2rem;
          }
          
          /* About Section */
          .about-text {
            font-size: 1rem;
            line-height: 1.6;
            color: #4a4a4a;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 16px;
            position: relative;
          }
          
          .about-text i {
            color: #ff4d6d;
            opacity: 0.5;
            font-size: 1rem;
          }
          
          /* Info Chips */
          .info-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 16px;
          }
          
          .info-chip {
            background: #f8f9fa;
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 0.9rem;
            color: #2d2d2d;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border: 1px solid #e9ecef;
          }
          
          .info-chip i {
            color: #ff4d6d;
            width: 16px;
          }
          
          /* Interest Tags */
          .interest-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .interest-tag {
            background: #f8f9fa;
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 0.9rem;
            color: #2d2d2d;
            border: 1px solid #e9ecef;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          
          .interest-tag:hover {
            background: #ff4d6d;
            color: white;
            border-color: #ff4d6d;
          }
          
          .interest-tag:hover i {
            color: white;
          }
          
          .interest-tag i {
            color: #ff4d6d;
            transition: all 0.2s;
          }
          
          /* Professional Cards */
          .professional-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
          }
          
          .professional-card {
            background: #f8f9fa;
            padding: 16px;
            border-radius: 16px;
            border: 1px solid #e9ecef;
          }
          
          .professional-label {
            font-size: 0.75rem;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          
          .professional-value {
            font-size: 1rem;
            font-weight: 500;
            color: #2d2d2d;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .professional-value i {
            color: #ff4d6d;
            width: 18px;
          }
          
          /* Verification Badge */
          .verification-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 30px;
            font-size: 0.8rem;
            font-weight: 600;
          }
          
          .verified-badge {
            background: #d4edda;
            color: #155724;
          }
          
          .unverified-badge {
            background: #f8d7da;
            color: #721c24;
          }
          
          /* Action Buttons */
          .action-buttons {
            display: flex;
            justify-content: center;
            gap: 12px;
            padding: 24px;
            flex-wrap: wrap;
          }
          
          .action-btn {
            padding: 12px 28px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.95rem;
            border: none;
            transition: all 0.3s;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            min-width: 130px;
          }
          
          .action-btn.primary {
            background: linear-gradient(135deg, #ff4d6d, #ff3355);
            color: white;
          }
          
          .action-btn.primary:hover {
            background: linear-gradient(135deg, #ff3355, #ff1a3f);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(255, 77, 109, 0.3);
          }
          
          .action-btn.secondary {
            background: white;
            color: #2d2d2d;
            border: 1px solid #2d2d2d;
          }
          
          .action-btn.secondary:hover {
            background: #2d2d2d;
            color: white;
            transform: translateY(-2px);
          }
          
          .action-btn.danger {
            background: white;
            color: #dc3545;
            border: 1px solid #dc3545;
          }
          
          .action-btn.danger:hover {
            background: #dc3545;
            color: white;
            transform: translateY(-2px);
          }
          
          .action-btn.success {
            background: #28a745;
            color: white;
          }
          
          .action-btn.success:hover {
            background: #218838;
            transform: translateY(-2px);
          }
          
          .action-btn.warning {
            background: #ffc107;
            color: #212529;
            border: 1px solid #ffc107;
          }
          
          .action-btn.warning:hover {
            background: #e0a800;
            transform: translateY(-2px);
          }
          
          .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
          }
          
          /* Relationship Badges */
          .relationship-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 30px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-left: 8px;
          }
          
          .relationship-badge.matched {
            background: linear-gradient(135deg, #ff4d6d, #ff3355);
            color: white;
          }
          
          .relationship-badge.liked {
            background: #6c757d;
            color: white;
          }
          
          .relationship-badge.blocked {
            background: #dc3545;
            color: white;
          }
          
          /* Empty States */
          .empty-value {
            color: #aaa;
            font-style: italic;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .photo-gallery {
              height: 50vh;
            }
            
            .main-photo {
              width: 100%;
              height: auto;
              max-height: 100%;
            }
            
            .gallery-name {
              font-size: 2rem;
            }
            
            .gallery-age {
              font-size: 1.5rem;
            }
            
            .profile-content {
              margin-top: -20px;
            }
            
            .action-btn {
              min-width: 120px;
              padding: 10px 20px;
            }
            
            .photo-indicators {
              bottom: 80px;
            }
            
            .photo-indicator {
              width: 30px;
            }
            
            .photo-indicator.active {
              width: 45px;
            }
          }
        `}
      </style>

      <div className="profile-detail-page">
        {/* Photo Gallery Hero with Carousel */}
        <div className="photo-gallery">
          {/* Back button */}
          <button onClick={goBack} className="gallery-back-btn">
            <i className="fas fa-arrow-left"></i>
          </button>
          
          {/* Photo count badge */}
          {photos.length > 1 && (
            <div className="photo-count">
              <i className="fas fa-images"></i>
              {activePhotoIndex + 1} / {photos.length}
            </div>
          )}
          
          {/* Main photo */}
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={formatName(profile)}
              className="main-photo"
              onClick={() => openPhotoModal(currentPhoto, activePhotoIndex)}
            />
          ) : (
            <div className="text-white">No photo available</div>
          )}
          
          {/* Photo Navigation Arrows - always visible */}
          {photos.length > 1 && (
            <>
              <div className="photo-nav photo-nav-left" onClick={prevPhoto}>
                <button>
                  <i className="fas fa-chevron-left"></i>
                </button>
              </div>
              <div className="photo-nav photo-nav-right" onClick={nextPhoto}>
                <button>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </>
          )}
          
          {/* Photo Indicators - dots */}
          {photos.length > 1 && (
            <div className="photo-indicators">
              {photos.map((_, index) => (
                <div 
                  key={index}
                  className={`photo-indicator ${activePhotoIndex === index ? 'active' : ''}`}
                  onClick={() => setActivePhotoIndex(index)}
                />
              ))}
            </div>
          )}
          
          {/* Thumbnail strip for quick navigation */}
          {photos.length > 1 && (
            <div className="thumbnail-strip">
              {photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo.image || photo}
                  alt={`Thumbnail ${index + 1}`}
                  className={`thumbnail ${activePhotoIndex === index ? 'active' : ''}`}
                  onClick={() => setActivePhotoIndex(index)}
                />
              ))}
            </div>
          )}
          
          {/* Overlay with name and location */}
          <div className="gallery-overlay">
            <div className="gallery-name">
              {formatName(profile)}
              <span className="gallery-age">{profile.age ? `, ${profile.age}` : ''}</span>
            </div>
            {profile.location && (
              <div className="gallery-location">
                <i className="fas fa-map-marker-alt"></i>
                {profile.location}
              </div>
            )}
          </div>
        </div>

        {/* Profile Content - Now naturally scrollable with page */}
        <div className="profile-content">
          {/* Relationship Status */}
          <div className="profile-section pt-3 pb-0">
            <div className="d-flex justify-content-end">
              {isMatched && (
                <span className="relationship-badge matched">
                  <i className="fas fa-heart me-1"></i> Matched
                </span>
              )}
              {!isMatched && isLiked && (
                <span className="relationship-badge liked">
                  <i className="fas fa-check me-1"></i> You Liked Them
                </span>
              )}
              {isBlocked && (
                <span className="relationship-badge blocked">
                  <i className="fas fa-ban me-1"></i> Blocked
                </span>
              )}
            </div>
          </div>

          {/* About Section */}
          <div className="profile-section">
            <h3 className="section-title">
              <i className="fas fa-heart"></i>
              About {profile.first_name || 'them'}
            </h3>
            
            <div className="about-text">
              <i className="fas fa-quote-left me-2"></i>
              {profile.bio || "This user hasn't added a bio yet"}
              <i className="fas fa-quote-right ms-2"></i>
            </div>

            {/* Quick Info Chips */}
            <div className="info-chips">
              {profile.gender && (
                <span className="info-chip">
                  <i className="fas fa-venus-mars"></i>
                  {profile.gender === 'male' ? 'Man' : profile.gender === 'female' ? 'Woman' : profile.gender}
                </span>
              )}
              
              {profile.interested_in && (
                <span className="info-chip">
                  <i className="fas fa-heart"></i>
                  {profile.interested_in === 'male' ? 'Men' : 
                   profile.interested_in === 'female' ? 'Women' : 'Everyone'}
                </span>
              )}
              
              {profile.height && (
                <span className="info-chip">
                  <i className="fas fa-ruler"></i>
                  {profile.height} cm
                </span>
              )}
              
              {calculateAge(profile.birth_date) && (
                <span className="info-chip">
                  <i className="fas fa-cake-candles"></i>
                  {calculateAge(profile.birth_date)} years
                </span>
              )}
            </div>

            {/* Verification Status */}
            <div className="mt-3">
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

          {/* Professional Info */}
          {(profile.career || profile.education) && (
            <div className="profile-section">
              <h3 className="section-title">
                <i className="fas fa-briefcase"></i>
                Work & Education
              </h3>
              
              <div className="professional-grid">
                {profile.career && (
                  <div className="professional-card">
                    <div className="professional-label">Career</div>
                    <div className="professional-value">
                      <i className="fas fa-briefcase"></i>
                      {profile.career}
                    </div>
                  </div>
                )}
                
                {profile.education && (
                  <div className="professional-card">
                    <div className="professional-label">Education</div>
                    <div className="professional-value">
                      <i className="fas fa-graduation-cap"></i>
                      {profile.education}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interests & Hobbies */}
          {(profile.passions || profile.hobbies || profile.favorite_music) && (
            <div className="profile-section">
              <h3 className="section-title">
                <i className="fas fa-star"></i>
                Interests & Vibes
              </h3>
              
              {profile.passions && (
                <div className="mb-3">
                  <h6 className="fw-semibold mb-2" style={{ fontSize: '0.9rem', color: '#4a4a4a' }}>
                    <i className="fas fa-fire me-1" style={{ color: '#ff4d6d' }}></i>
                    Passions
                  </h6>
                  <div className="interest-tags">
                    {profile.passions.split(',').map((item, index) => (
                      <span key={index} className="interest-tag">
                        <i className="fas fa-heart"></i>
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.hobbies && (
                <div className="mb-3">
                  <h6 className="fw-semibold mb-2" style={{ fontSize: '0.9rem', color: '#4a4a4a' }}>
                    <i className="fas fa-pencil me-1" style={{ color: '#ff4d6d' }}></i>
                    Hobbies
                  </h6>
                  <div className="interest-tags">
                    {profile.hobbies.split(',').map((item, index) => (
                      <span key={index} className="interest-tag">
                        <i className="fas fa-heart"></i>
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.favorite_music && (
                <div className="mb-2">
                  <h6 className="fw-semibold mb-2" style={{ fontSize: '0.9rem', color: '#4a4a4a' }}>
                    <i className="fas fa-music me-1" style={{ color: '#ff4d6d' }}></i>
                    Music Vibes
                  </h6>
                  <div className="interest-tags">
                    {profile.favorite_music.split(',').map((item, index) => (
                      <span key={index} className="interest-tag">
                        <i className="fas fa-heart"></i>
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            {isBlocked ? (
              <button
                onClick={handleUnblock}
                className="action-btn success"
              >
                <i className="fas fa-check me-2"></i>
                Unblock
              </button>
            ) : (
              <>
                {isMatched ? (
                  <>
                    <button
                      onClick={() => navigate(`/messages/${profile.id}`)}
                      className="action-btn primary"
                    >
                      <i className="fas fa-comment-dots me-2"></i>
                      Message
                    </button>
                    <button
                      onClick={handleUnmatch}
                      className="action-btn danger"
                    >
                      <i className="fas fa-heart-broken me-2"></i>
                      Unmatch
                    </button>
                    {/* Add Report button for matched users */}
                    <button
                      onClick={openReportModal}
                      className="action-btn warning"
                    >
                      <i className="fas fa-flag me-2"></i>
                      Report
                    </button>
                  </>
                ) : isLiked ? (
                  <>
                    <button
                      onClick={handleUnlike}
                      className="action-btn secondary"
                    >
                      <i className="fas fa-times me-2"></i>
                      Unlike
                    </button>
                    <button
                      onClick={() => navigate(`/messages/${profile.id}`)}
                      className="action-btn primary"
                      disabled={!isMatched}
                    >
                      <i className="fas fa-comment-dots me-2"></i>
                      Message
                    </button>
                    {/* Add Report button for liked but not matched users */}
                    <button
                      onClick={openReportModal}
                      className="action-btn warning"
                    >
                      <i className="fas fa-flag me-2"></i>
                      Report
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleLike}
                      className="action-btn primary"
                    >
                      <i className="fas fa-heart me-2"></i>
                      Like
                    </button>
                    {/* Add Report button for non-liked users */}
                    <button
                      onClick={openReportModal}
                      className="action-btn warning"
                    >
                      <i className="fas fa-flag me-2"></i>
                      Report
                    </button>
                  </>
                )}
                
                <button
                  onClick={handleBlock}
                  className="action-btn secondary"
                >
                  <i className="fas fa-ban me-2"></i>
                  Block
                </button>
              </>
            )}
          </div>

          {/* Romantic Footer */}
          <div className="text-center pb-4">
            <p className="small text-secondary" style={{ fontSize: '0.8rem' }}>
              <i className="fas fa-heart me-1" style={{ color: '#ff4d6d' }}></i>
              Take a chance on love
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
