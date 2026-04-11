import React, { useRef } from "react";
import { formatName } from "../utils/helpers";
import "./CenterBlock.css";

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
      borderRadius: "50%",
    }}
    aria-label={label}
  >
    <i className={icon} style={{ color: iconColor, fontSize: "1.3rem" }} />
    <span className="round-tooltip">{label}</span>
  </button>
);

export default function CenterBlock({
  profilesLoading,
  apiError,
  profiles,
  profileIndex,
  currentProfile,
  getCurrentPhotoUrl,
  openPhotoModal,
  getCurrentProfilePhotos,
  currentPhotoIndex,
  setCurrentPhotoIndex,
  goToPrevPhoto,
  goToNextPhoto,
  isPhotoAnimating,
  isMatched,
  isLiked,
  goToProfile,
  handlePass,
  handleLike,
  isAnimating,
  goToMessenger,
  setMatchedProfile,
  setMatchModalOpen,
  openReportModal,
  handleBlock,
  centerCardStyle,
  reloadProfiles,
  swipeLimits
}) {
  // Swipe detection refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 992;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) < minSwipeDistance || Math.abs(deltaX) < Math.abs(deltaY)) {
      touchStartX.current = 0;
      touchEndX.current = 0;
      touchStartY.current = 0;
      touchEndY.current = 0;
      return;
    }

    if (deltaX > 0) {
      if (!isAnimating && !isMatched(currentProfile?.id) && swipeLimits?.can_like !== false) {
        handleLike();
      }
    } else {
      if (!isAnimating) {
        handlePass();
      }
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
    touchStartY.current = 0;
    touchEndY.current = 0;
  };

  if (profilesLoading && !currentProfile) {
    return (
      <div className="h-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div className="text-secondary">Chargement des profils...</div>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="h-100 d-flex align-items-center justify-content-center">
        <div className="text-center p-4">
          <div className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10" style={{ width: 80, height: 80 }}>
            <i className="fas fa-exclamation-triangle text-danger" style={{ fontSize: "2rem" }} />
          </div>
          <h5 className="fw-bold mb-2">Erreur de chargement</h5>
          <p className="text-secondary mb-3">{apiError}</p>
          <button className="btn btn-outline-primary" onClick={reloadProfiles}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!profiles.length || profileIndex >= profiles.length || !currentProfile) {
    return (
      <div className="h-100 d-flex align-items-center justify-content-center">
        <div className="text-center p-4">
          <div className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle" style={{ width: 100, height: 100, background: "rgba(255,77,109,0.1)" }}>
            <i className="fas fa-heart" style={{ color: "#ff4d6d", fontSize: "2.5rem" }} />
          </div>
          <h4 className="fw-bold mb-2">Plus de profils</h4>
          <p className="text-secondary mb-4">Revenez plus tard pour découvrir de nouvelles personnes !</p>
          <button
            className="btn btn-primary rounded-pill px-5 py-2"
            onClick={reloadProfiles}
            style={{ background: "#ff4d6d", border: "none" }}
          >
            Rafraîchir
          </button>
        </div>
      </div>
    );
  }

  const safeGoToPrevPhoto = (e) => {
    if (!currentProfile) return;
    const photos = getCurrentProfilePhotos();
    if (isPhotoAnimating || !photos || photos.length <= 1) return;
    goToPrevPhoto(e);
  };

  const safeGoToNextPhoto = (e) => {
    if (!currentProfile) return;
    const photos = getCurrentProfilePhotos();
    if (isPhotoAnimating || !photos || photos.length <= 1) return;
    goToNextPhoto(e);
  };

  const safeOpenPhotoModal = () => {
    if (!currentProfile) return;
    const photos = getCurrentProfilePhotos();
    if (!photos || photos.length === 0) return;
    openPhotoModal(getCurrentPhotoUrl(), currentProfile.id);
  };

  const safeSetCurrentPhotoIndex = (idx) => {
    if (!currentProfile) return;
    const photos = getCurrentProfilePhotos();
    if (!photos || idx >= photos.length) return;
    setCurrentPhotoIndex(idx);
  };

  const getLocationDisplay = () => {
    if (currentProfile.location && currentProfile.location.trim()) {
      return currentProfile.location;
    }
    return null;
  };

  const locationDisplay = getLocationDisplay();
  const mobileCardStyle = isMobile 
    ? { ...centerCardStyle, borderRadius: "0px", boxShadow: "none", overflow: "visible" }
    : centerCardStyle;
  const mobileImageStyle = isMobile ? { borderRadius: "0px", overflow: "hidden" } : {};

  return (
    <div 
      className="center-card"
      style={mobileCardStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        key={currentProfile.id}
        className="image-container" 
        style={mobileImageStyle}
        onClick={safeOpenPhotoModal}
      >
        {getCurrentPhotoUrl() ? (
          <>
            <img
              src={getCurrentPhotoUrl()}
              alt={formatName(currentProfile) || "Profil"}
              onError={(e) => {
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (parent && !parent.querySelector('.photo-error-message')) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'p-5 text-secondary photo-error-message';
                  errorDiv.textContent = 'Photo non disponible';
                  parent.appendChild(errorDiv);
                }
              }}
            />
            
            {getCurrentProfilePhotos().length > 1 && (
              <div className="photo-indicators">
                {getCurrentProfilePhotos().map((_, idx) => (
                  <div
                    key={idx}
                    className={`photo-dot ${idx === currentPhotoIndex ? 'active' : 'inactive'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      safeSetCurrentPhotoIndex(idx);
                    }}
                  />
                ))}
              </div>
            )}
            
            {getCurrentProfilePhotos().length > 1 && (
              <>
                <button
                  className="photo-nav-arrow left"
                  onClick={safeGoToPrevPhoto}
                  disabled={isPhotoAnimating}
                >
                  <i className="fas fa-chevron-left" style={{ color: '#333', fontSize: '1rem' }} />
                </button>
                <button
                  className="photo-nav-arrow right"
                  onClick={safeGoToNextPhoto}
                  disabled={isPhotoAnimating}
                >
                  <i className="fas fa-chevron-right" style={{ color: '#333', fontSize: '1rem' }} />
                </button>
              </>
            )}
            
            {getCurrentProfilePhotos().length > 1 && (
              <div className="photo-counter">
                {currentPhotoIndex + 1} / {getCurrentProfilePhotos().length}
              </div>
            )}
          </>
        ) : (
          <div className="p-5 text-secondary">Photo non disponible</div>
        )}
      </div>

      <div className="card-content">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h2 className="fw-bold mb-0 clickable-profile" onClick={() => goToProfile(currentProfile.id)}>
              {formatName(currentProfile)}
              {currentProfile.age ? `, ${currentProfile.age}` : ''}
            </h2>
            {isMatched(currentProfile.id) && (
              <span className="status-badge matched-badge">Match</span>
            )}
            {!isMatched(currentProfile.id) && isLiked(currentProfile.id) && (
              <span className="status-badge liked-badge">Aimé</span>
            )}
          </div>
          {locationDisplay && (
            <div className="d-flex align-items-center text-secondary" style={{ fontSize: '0.9rem' }}>
              <i className="fas fa-map-marker-alt me-1" style={{ fontSize: '0.8rem' }} />
              <span className="text-truncate" style={{ maxWidth: '150px' }}>{locationDisplay}</span>
            </div>
          )}
        </div>
        
        <p className="text-secondary mb-3" style={{ fontSize: "1rem", lineHeight: 1.5 }}>{currentProfile.bio || "Pas encore de bio"}</p>

        {swipeLimits && !swipeLimits.can_like && (
          <div className="alert alert-warning text-center py-2 mb-3" style={{ fontSize: "0.85rem" }}>
            <i className="fas fa-info-circle me-2"></i>
            Limite quotidienne de likes atteinte ({swipeLimits.likes_today}/{swipeLimits.daily_limit})
          </div>
        )}

        {isMatched(currentProfile.id) ? (
          <div className="d-flex justify-content-center gap-2 flex-wrap mt-2" style={{ marginBottom: 0 }}>
            <button
              onClick={handlePass}
              disabled={isAnimating}
              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
              style={{
                width: "60px",
                height: "60px",
                background: "#ffffff",
                border: "1px solid #e9ecef",
                borderRadius: "50%",
              }}
              aria-label="Passer"
            >
              <i className="fas fa-times" style={{ color: "#adb5bd", fontSize: "1.3rem" }} />
            </button>

            <RoundActionBtn
              onClick={() => goToProfile(currentProfile.id)}
              bg="#ffffff"
              border="1px solid #e9ecef"
              icon="fas fa-user"
              iconColor="#6f42c1"
              label="Voir le profil"
            />

            <RoundActionBtn
              onClick={() => goToMessenger(currentProfile.id)}
              bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
              border="none"
              icon="fas fa-comment-dots"
              iconColor="#ffffff"
              label="Envoyer un message"
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
              label="Annuler le match"
            />

            <RoundActionBtn
              onClick={() => openReportModal(currentProfile)}
              bg="#ffffff"
              border="1px solid #ffc107"
              icon="fas fa-flag"
              iconColor="#ffc107"
              label="Signaler"
            />

            <RoundActionBtn
              onClick={() => handleBlock(currentProfile)}
              bg="#1a1a1a"
              border="none"
              icon="fas fa-ban"
              iconColor="#ffffff"
              label="Bloquer"
            />
          </div>
        ) : (
          <div className="d-flex justify-content-center gap-3 mt-2" style={{ marginBottom: 0, paddingBottom: 0 }}>
            <button
              onClick={handlePass}
              disabled={isAnimating}
              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
              style={{
                width: "60px",
                height: "60px",
                background: "#ffffff",
                border: "1px solid #e9ecef",
                borderRadius: "50%",
              }}
              aria-label="Passer"
            >
              <i className="fas fa-times" style={{ color: "#adb5bd", fontSize: "1.3rem" }} />
            </button>

            <button
              onClick={handleLike}
              disabled={isAnimating || (swipeLimits && !swipeLimits.can_like)}
              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
              style={{
                width: "74px",
                height: "74px",
                background: "linear-gradient(145deg, #ff4d6d, #ff3355)",
                border: "none",
                opacity: (swipeLimits && !swipeLimits.can_like) ? 0.5 : 1,
                borderRadius: "50%",
              }}
              aria-label="Aimer"
            >
              <i className="fas fa-heart" style={{ color: "#ffffff", fontSize: "1.6rem" }} />
            </button>

            <button
              onClick={() => goToProfile(currentProfile.id)}
              disabled={isAnimating}
              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
              style={{
                width: "60px",
                height: "60px",
                background: "#ffffff",
                border: "1px solid #e9ecef",
                borderRadius: "50%",
              }}
              aria-label="Voir le profil"
            >
              <i className="fas fa-user" style={{ color: "#6f42c1", fontSize: "1.2rem" }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}