import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import ReportModal from "../components/ReportModal";
import API from '@/api/axios';
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { useI18n } from "../context/I18nContext";
import { resolveMediaUrl } from "../utils/apiBase";
import { markFunnelStage } from "../lib/attribution";
import { trackFirstLike, trackFirstMatch } from "../lib/metaPixel";

export default function ProfileDetail() {
  const { t } = useI18n();
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
  const [conversationId, setConversationId] = useState(null);
  const [coeurLimits, setCoeurLimits] = useState({ can_use: true, remaining: 3, daily_limit: 3 });

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [userToReport, setUserToReport] = useState(null);
  const [dotsMenuOpen, setDotsMenuOpen] = useState(false);
  
  // Photo gallery state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalPhotos, setModalPhotos] = useState([]);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const getProfilePhotoUrl = (path) => {
    return resolveMediaUrl(path);
  };

  // Fetch user photos
  const fetchUserPhotos = async (userId) => {
    try {
      const response = await API.get(`/users/${userId}/photos/`);
      const photos = response.data.map(photo => ({
        id: photo.id,
        image: photo.image_url || getProfilePhotoUrl(photo.image),
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

        await fetchUserPhotos(id);
        await checkRelationshipStatus(id);

        API.get("/interactions/coeur/limits/").then(r => setCoeurLimits(r.data)).catch(() => {});

      } catch (error) {
        console.error("Error fetching data:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
        } else if (error.response?.status === 404) {
          setError(t("profileDetail.notFound"));
        } else {
          setError(error.response?.data?.message || error.message || t("profileDetail.fetchError"));
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
        API.get('/chat/conversations/').then(r => {
          const conv = r.data.find(c =>
            c.other_user?.id === parseInt(profileId) ||
            c.match_id === match.id
          );
          if (conv) setConversationId(conv.id);
        }).catch(() => {});
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
      await API.post("/interactions/like/", { to_user_id: profile.id });
      setIsLiked(true);
      trackFirstLike(user?.id);
      markFunnelStage(user?.id, "first_like");
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

  const handlePass = async () => {
    try {
      await API.post("/interactions/pass/", { to_user_id: profile.id });
    } catch (error) {
      console.error("Error passing profile:", error);
    } finally {
      navigate(-1);
    }
  };

  const handleCoupDeCoeur = async () => {
    if (!coeurLimits.can_use) return;
    try {
      await API.post("/interactions/like/", { to_user_id: profile.id, type: 'coup_de_coeur' });
      setIsLiked(true);
      setCoeurLimits(prev => ({
        ...prev,
        remaining: Math.max(0, prev.remaining - 1),
        can_use: prev.remaining > 1,
      }));
      trackFirstLike(user?.id);
      markFunnelStage(user?.id, "first_like");
      await checkForMatch();
    } catch (error) {
      if (error.response?.status === 403) {
        alert(t('profileDetail.coupDeCoeurLimit'));
      }
      console.error("Error sending coup de coeur:", error);
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
        if (response.status === 201) {
          trackFirstMatch(user?.id);
          markFunnelStage(user?.id, "first_match");
        }
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

  const getAllPhotos = () => {
    const photos = [];
    
    if (profile?.profile_photo_url) {
      photos.push({
        id: 'main',
        image: profile.profile_photo_url,
        is_main: true
      });
    } else if (profile?.profile_photo) {
      photos.push({
        id: 'main',
        image: getProfilePhotoUrl(profile.profile_photo),
        is_main: true
      });
    }
    
    userPhotos.forEach(photo => {
      const photoUrl = photo.image;
      const mainPhotoUrl = profile?.profile_photo_url || getProfilePhotoUrl(profile?.profile_photo);
      if (photoUrl !== mainPhotoUrl) {
        photos.push(photo);
      }
    });
    
    return photos;
  };

  const getCurrentPhoto = () => {
    const photos = getAllPhotos();
    if (photos.length === 0) return null;
    return photos[activePhotoIndex]?.image || photos[0]?.image;
  };

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
          <p className="mt-3 text-secondary">{t("profileDetail.loadingMatch")}</p>
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
            {error || t("profileDetail.notFound")}
          </div>
          <button className="btn btn-outline-danger mt-3 px-5 py-2" onClick={goBack} style={{ borderRadius: "30px" }}>
            <i className="fas fa-arrow-left me-2"></i>
            {t("profileDetail.back")}
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

      {dotsMenuOpen && (
        <>
          <div onClick={() => setDotsMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '20px 20px 0 0', padding: '12px 0 calc(24px + env(safe-area-inset-bottom))', zIndex: 201, boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 2, margin: '0 auto 20px' }} />
            <button onClick={() => { setDotsMenuOpen(false); openReportModal(profile); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 24px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.95rem', color: '#1A1A2E' }}>
              🚩 <span>Signaler ce profil</span>
            </button>
            <button onClick={() => { setDotsMenuOpen(false); handleBlock(profile); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 24px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.95rem', color: '#FF2D55', borderTop: '1px solid #F0EEE8' }}>
              🚫 <span>Bloquer cet utilisateur</span>
            </button>
          </div>
        </>
      )}

      <style>{`
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
          gap: 8px;
          font-weight: 500;
        }

        .interest-tag:hover {
          background: #ff4d6d;
          color: white;
          border-color: #ff4d6d;
          transform: translateY(-1px);
        }

        .interest-tag::before {
          content: '';
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff4d6d;
          display: inline-block;
          flex-shrink: 0;
        }

        .interest-tag:hover::before {
          background: #ffffff;
        }

        .interest-tag.passion-tag {
          border-color: #ffd8df;
          background: #fff6f8;
        }

        .interest-tag.hobby-tag {
          border-color: #d7ecff;
          background: #f5fbff;
        }

        .interest-tag.music-tag {
          border-color: #efe2ff;
          background: #faf7ff;
        }
        
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
        
        .empty-value {
          color: #aaa;
          font-style: italic;
        }
        
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
        .pd-page { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FAF8F4; min-height: 100vh; padding-bottom: calc(160px + env(safe-area-inset-bottom)); }
        .pd-hero { position: relative; width: 100%; height: 55vh; background: #1A1A2E; overflow: hidden; }
        .pd-hero-img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
        .pd-hero-gradient { position: absolute; bottom: 0; left: 0; right: 0; height: 40%; background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%); pointer-events: none; }
        .pd-topbar { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; z-index: 10; }
        .pd-topbar-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(255,255,255,0.88); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1A1A2E; font-size: 1.1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.18); flex-shrink: 0; }
        .pd-verified-badge { background: rgba(0,0,0,0.55); backdrop-filter: blur(8px); border-radius: 20px; padding: 4px 10px; font-size: 10px; color: #4ade80; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        .pd-hero-info { position: absolute; bottom: 16px; left: 16px; right: 64px; color: #fff; z-index: 10; }
        .pd-hero-name { font-size: 22px; font-weight: 700; line-height: 1.2; text-shadow: 0 1px 4px rgba(0,0,0,0.4); margin-bottom: 4px; }
        .pd-hero-city { font-size: 14px; opacity: 0.92; display: flex; align-items: center; gap: 4px; }
        .pd-photo-nav-left, .pd-photo-nav-right { position: absolute; top: 0; bottom: 0; width: 50%; z-index: 5; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .pd-photo-nav-left { left: 0; }
        .pd-photo-nav-right { right: 0; }
        .pd-photo-dots { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; z-index: 10; }
        .pd-photo-dot { height: 3px; border-radius: 2px; background: rgba(255,255,255,0.45); transition: all 0.2s; }
        .pd-photo-dot.active { background: #fff; }
        .pd-card { background: #fff; border-radius: 20px 20px 0 0; margin-top: -16px; position: relative; z-index: 20; min-height: 50vh; }
        .pd-section { padding: 20px 20px 0; }
        .pd-divider { height: 1px; background: #F0EEE8; margin: 16px 20px 0; }
        .pd-section-label { font-size: 11px; font-weight: 700; color: #FF2D55; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
        .pd-bio { font-size: 0.95rem; line-height: 1.6; color: #4a4a4a; margin: 0; }
        .pd-chip { background: #F8F5F0; padding: 6px 14px; border-radius: 999px; font-size: 0.83rem; color: #2d2d2d; display: inline-flex; align-items: center; gap: 6px; border: 1px solid #E8E5DF; }
        .pd-chip i { color: #FF2D55; font-size: 0.78rem; }
        .pd-tag { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 0.83rem; font-weight: 500; border: 1px solid #E8E5DF; background: #fff; color: #2d2d2d; margin: 0 4px 6px 0; }
        .pd-action-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #F0EEE8; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); z-index: 100; box-shadow: 0 -4px 20px rgba(0,0,0,0.07); }
        .pd-btn-row { display: flex; gap: 10px; margin-bottom: 8px; }
        .pd-btn { padding: 13px 16px; border-radius: 999px; border: none; font-weight: 600; font-size: 0.92rem; cursor: pointer; transition: opacity 0.15s; flex: 1; text-align: center; }
        .pd-btn:active { opacity: 0.8; }
        .pd-btn-ghost { background: transparent; border: 1.5px solid #FF2D55 !important; color: #FF2D55; }
        .pd-btn-pink { background: #FF2D55; color: #fff; }
        .pd-btn-purple { background: #8B30C9; color: #fff; width: 100%; display: block; }
        .pd-btn-purple:disabled { background: #d1d5db; opacity: 0.6; cursor: not-allowed; }
        .pd-btn-green { background: #22c55e; color: #fff; width: 100%; display: block; }
        .pd-prompt-card { background: #FAF8F4; border: 1px solid #E8E5DF; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
        .pd-prompt-q { font-size: 11px; color: #999; margin-bottom: 6px; }
        .pd-prompt-a { font-size: 0.9rem; color: #1A1A2E; line-height: 1.5; }
        .pd-tagline { text-align: center; font-style: italic; color: #999; font-size: 13px; padding: 24px 20px 28px; }
        @media (min-width: 768px) {
          .pd-page { max-width: 480px; margin: 0 auto; }
          .pd-action-bar { max-width: 480px; left: 50%; transform: translateX(-50%); right: auto; width: 480px; }
        }
      `}</style>

      <div className="pd-page">
        {/* Hero photo */}
        <div className="pd-hero">
          {currentPhoto ? (
            <img src={currentPhoto} alt={formatName(profile)} className="pd-hero-img" onClick={() => openPhotoModal(currentPhoto, activePhotoIndex)} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF2D55', fontSize: '3rem' }}>
              <i className="fas fa-user" />
            </div>
          )}
          <div className="pd-hero-gradient" />
          {photos.length > 1 && (
            <>
              <div className="pd-photo-nav-left" onClick={prevPhoto} />
              <div className="pd-photo-nav-right" onClick={nextPhoto} />
            </>
          )}
          {photos.length > 1 && (
            <div className="pd-photo-dots">
              {photos.map((_, i) => (
                <div key={i} className={`pd-photo-dot${i === activePhotoIndex ? ' active' : ''}`} style={{ width: i === activePhotoIndex ? 24 : 14 }} onClick={() => setActivePhotoIndex(i)} />
              ))}
            </div>
          )}
          <div className="pd-topbar">
            <button className="pd-topbar-btn" onClick={goBack}>
              <i className="fas fa-arrow-left" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {profile.is_verified && (
                <span className="pd-verified-badge">
                  <i className="fas fa-check-circle" style={{ fontSize: 9 }} /> Vérifié
                </span>
              )}
              <button className="pd-topbar-btn" onClick={() => setDotsMenuOpen(true)} style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: 1 }}>
                •••
              </button>
            </div>
          </div>
          <div className="pd-hero-info">
            <div className="pd-hero-name">
              {formatName(profile)}{(profile.age || calculateAge(profile.birth_date)) ? `, ${profile.age || calculateAge(profile.birth_date)}` : ''}
            </div>
            {profile.location && (
              <div className="pd-hero-city">
                <i className="fas fa-map-marker-alt" style={{ color: '#FF2D55', fontSize: 11 }} />
                {profile.location}
              </div>
            )}
          </div>
        </div>

        {/* White card */}
        <div className="pd-card">
          {profile.bio && (
            <>
              <div className="pd-section" style={{ paddingTop: 24 }}>
                <div className="pd-section-label"><i className="fas fa-heart" /> À PROPOS</div>
                <p className="pd-bio">{profile.bio}</p>
              </div>
              <div className="pd-divider" />
            </>
          )}

          <div className="pd-section" style={{ paddingTop: profile.bio ? 16 : 24 }}>
            <div className="pd-section-label"><i className="fas fa-info-circle" /> INFOS DE BASE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profile.gender && (
                <span className="pd-chip">
                  <i className="fas fa-venus-mars" />
                  {profile.gender === 'male' ? t("profileDetail.man") : profile.gender === 'female' ? t("profileDetail.woman") : profile.gender}
                </span>
              )}
              {(profile.age || calculateAge(profile.birth_date)) && (
                <span className="pd-chip">
                  <i className="fas fa-cake-candles" />
                  {profile.age || calculateAge(profile.birth_date)} {t("profileDetail.years")}
                </span>
              )}
              {profile.height && (
                <span className="pd-chip">
                  <i className="fas fa-ruler" />
                  {profile.height} cm
                </span>
              )}
              {profile.is_verified && (
                <span className="pd-chip" style={{ color: '#22c55e', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                  <i className="fas fa-check-circle" style={{ color: '#22c55e' }} /> {t("profileDetail.verified")}
                </span>
              )}
            </div>
          </div>

          {(profile.career || profile.education) && (
            <>
              <div className="pd-divider" />
              <div className="pd-section">
                <div className="pd-section-label"><i className="fas fa-briefcase" /> {t("profileDetail.workEducation")}</div>
                {profile.career && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem', color: '#2d2d2d' }}>
                    <i className="fas fa-briefcase" style={{ color: '#FF2D55', width: 16 }} /> {profile.career}
                  </div>
                )}
                {profile.education && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#2d2d2d' }}>
                    <i className="fas fa-graduation-cap" style={{ color: '#FF2D55', width: 16 }} /> {profile.education}
                  </div>
                )}
              </div>
            </>
          )}

          {(profile.passions || profile.hobbies || profile.favorite_music) && (
            <>
              <div className="pd-divider" />
              <div className="pd-section">
                <div className="pd-section-label"><i className="fas fa-star" /> {t("profileDetail.interests")}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                  {profile.passions && profile.passions.split(',').map((item, index) => (
                    <span key={index} className="pd-tag" style={{ borderColor: '#ffd8df', background: '#fff6f8' }}>{item.trim()}</span>
                  ))}
                  {profile.hobbies && profile.hobbies.split(',').map((item, index) => (
                    <span key={`h${index}`} className="pd-tag" style={{ borderColor: '#d7ecff', background: '#f5fbff' }}>{item.trim()}</span>
                  ))}
                  {profile.favorite_music && (
                    <>
                      <div style={{ width: '100%', marginTop: 10, marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#FF2D55', textTransform: 'uppercase', letterSpacing: 1.2, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="fas fa-music" /> {t("profileDetail.musicVibes")}
                      </div>
                      {profile.favorite_music.split(',').map((item, index) => (
                        <span key={`m${index}`} className="pd-tag" style={{ borderColor: '#efe2ff', background: '#faf7ff' }}>{item.trim()}</span>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {Array.isArray(profile.profile_prompts) && profile.profile_prompts.length > 0 && (
            <>
              <div className="pd-divider" />
              <div className="pd-section">
                <div className="pd-section-label"><i className="fas fa-comment-dots" /> EN QUELQUES MOTS</div>
                {profile.profile_prompts.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="pd-prompt-card">
                    <div className="pd-prompt-q">{item.question}</div>
                    <div className="pd-prompt-a">{item.answer}</div>
                    {isMatched && (
                      <button
                        onClick={() => navigate('/messages', { state: { promptContext: item.question, conversationId, matchId } })}
                        style={{ marginTop: 10, background: 'transparent', border: '1px solid #E8E5DF', borderRadius: 999, padding: '6px 14px', fontSize: 12, color: '#FF2D55', cursor: 'pointer', fontWeight: 500 }}
                      >
                        💬 Commenter ça
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="pd-tagline">L'amour vaut le risque</div>
        </div>
      </div>

      {/* Fixed action bar */}
      <div className="pd-action-bar">
        {isBlocked ? (
          <button className="pd-btn pd-btn-green" onClick={handleUnblock}>
            <i className="fas fa-check" style={{ marginRight: 6 }} /> {t("profileDetail.unblock")}
          </button>
        ) : isMatched ? (
          <>
            <div className="pd-btn-row">
              <button className="pd-btn pd-btn-pink" style={{ flex: 1 }} onClick={() => navigate(`/messages/${profile.id}`)}>
                💬 Envoyer un message
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <button onClick={handleUnmatch} style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                Unmatch
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="pd-btn-row">
              <button className="pd-btn pd-btn-ghost" onClick={handlePass}>Passer</button>
              <button className="pd-btn pd-btn-pink" onClick={handleLike}>
                {isLiked ? '❤️ Aimé' : "J'aime ❤️"}
              </button>
            </div>
            <button className="pd-btn pd-btn-purple" onClick={handleCoupDeCoeur} disabled={!coeurLimits.can_use}>
              💜 Coup de Coeur {coeurLimits.can_use ? `(${coeurLimits.remaining})` : '(0)'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
