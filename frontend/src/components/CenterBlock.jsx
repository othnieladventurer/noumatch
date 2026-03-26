import React from "react";
import { formatName } from "../utils/helpers";

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
  reloadProfiles
}) {
  if (profilesLoading) {
    return (
      <div className="h-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
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
          <button
            className="btn btn-outline-primary"
            onClick={reloadProfiles}
          >
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
          <div
            className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle"
            style={{ width: 100, height: 100, background: "rgba(255,77,109,0.1)" }}
          >
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

  // Safe wrapper for photo navigation to prevent DOM errors
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

  // Responsive styles - rounded corners only on desktop
  const responsiveCardStyle = {
    ...centerCardStyle,
    borderRadius: typeof window !== 'undefined' && window.innerWidth < 992 ? '0px' : '24px',
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 0,
    paddingBottom: 0,
    overflow: 'hidden'
  };

  // Image container style - balanced height on desktop
  const imageContainerStyle = {
    position: 'relative',
    width: '100%',
    cursor: 'pointer',
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
    flex: typeof window !== 'undefined' && window.innerWidth < 992 ? 1.2 : 1.5,
    minHeight: typeof window !== 'undefined' && window.innerWidth < 992 ? '50vh' : '350px'
  };

  // Get location display - handle empty location
  const getLocationDisplay = () => {
    if (currentProfile.location && currentProfile.location.trim()) {
      return currentProfile.location;
    }
    return null;
  };

  const locationDisplay = getLocationDisplay();

  return (
    <div className="center-card" style={responsiveCardStyle}>
      {/* Image du profil avec navigation photo */}
      <div 
        className="image-container" 
        onClick={safeOpenPhotoModal}
        style={imageContainerStyle}
      >
        {getCurrentPhotoUrl() ? (
          <>
            <img
              src={getCurrentPhotoUrl()}
              alt={formatName(currentProfile) || "Profil"}
              style={{
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                transform: 'translateX(0) scale(1)',
                opacity: 1,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
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
            
            {/* Photo indicators */}
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
            
            {/* Navigation arrows */}
            {getCurrentProfilePhotos().length > 1 && (
              <>
                <button
                  className="photo-nav-arrow left"
                  onClick={safeGoToPrevPhoto}
                  disabled={isPhotoAnimating}
                  style={{ opacity: isPhotoAnimating ? 0.5 : 1 }}
                >
                  <i className="fas fa-chevron-left" style={{ color: '#333', fontSize: '1rem' }} />
                </button>
                
                <button
                  className="photo-nav-arrow right"
                  onClick={safeGoToNextPhoto}
                  disabled={isPhotoAnimating}
                  style={{ opacity: isPhotoAnimating ? 0.5 : 1 }}
                >
                  <i className="fas fa-chevron-right" style={{ color: '#333', fontSize: '1rem' }} />
                </button>
              </>
            )}
            
            {/* Photo count */}
            {getCurrentProfilePhotos().length > 1 && (
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                zIndex: 15
              }}>
                {currentPhotoIndex + 1} / {getCurrentProfilePhotos().length}
              </div>
            )}
          </>
        ) : (
          <div className="p-5 text-secondary">Photo non disponible</div>
        )}
      </div>

      {/* Content area - NO SCROLLBAR on desktop */}
      <div className="card-content" style={{ flex: 1, overflowY: 'visible', padding: '16px', margin: 0 }}>
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
          {/* Name and Age - left side */}
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
          
          {/* Location - right side on same line (only if location exists) */}
          {locationDisplay && (
            <div className="d-flex align-items-center text-secondary" style={{ fontSize: '0.9rem' }}>
              <i className="fas fa-map-marker-alt me-1" style={{ fontSize: '0.8rem' }} />
              <span className="text-truncate" style={{ maxWidth: '150px' }}>{locationDisplay}</span>
            </div>
          )}
        </div>
        
        <p className="text-secondary mb-3" style={{ fontSize: "1rem", lineHeight: 1.5 }}>{currentProfile.bio || "Pas encore de bio"}</p>

        {isMatched(currentProfile.id) ? (
          <div className="d-flex justify-content-center gap-2 flex-wrap mt-3" style={{ marginBottom: 0, paddingBottom: 0 }}>
            <button
              onClick={handlePass}
              disabled={isAnimating}
              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
              style={{
                width: "60px",
                height: "60px",
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
          <div className="d-flex justify-content-center gap-3 mt-3" style={{ marginBottom: 0, paddingBottom: 0 }}>
            <button
              onClick={handlePass}
              disabled={isAnimating}
              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
              style={{
                width: "60px",
                height: "60px",
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
              aria-label="Passer"
            >
              <i className="fas fa-times" style={{ color: "#adb5bd", fontSize: "1.3rem" }} />
            </button>

            <button
              onClick={handleLike}
              disabled={isAnimating}
              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
              style={{
                width: "74px",
                height: "74px",
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
              aria-label="Voir le profil"
            >
              <i className="fas fa-user" style={{ color: "#6f42c1", fontSize: "1.2rem" }} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 991.98px) {
          .center-card {
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          
          .image-container {
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            flex: 1.2 !important;
            min-height: 50vh !important;
          }
          
          .card-content {
            padding: 12px 16px !important;
            margin: 0 !important;
            flex: 0.9 !important;
            overflow-y: auto !important;
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }
          
          /* Remove any possible margin on paragraphs or buttons */
          .card-content p,
          .card-content div,
          .card-content button {
            margin-bottom: 0 !important;
          }
          
          /* Ensure action buttons don't create space */
          .card-content .d-flex {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
        }
        
        @media (min-width: 992px) {
          .center-card {
            border-radius: 24px !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1) !important;
          }
          .image-container {
            min-height: 350px !important;
            flex: 1.5 !important;
          }
          .card-content {
            padding-bottom: 20px !important;
            overflow-y: visible !important;
          }
        }
      `}</style>
    </div>
  );
}


