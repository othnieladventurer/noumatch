import React, { useRef } from "react";
import { formatName } from "../utils/helpers";

/**
 * Optimized RoundActionBtn for Viewport clamping
 */
const RoundActionBtn = ({ onClick, bg, icon, iconColor, label, size = 52, disabled = false }) => (
  <button 
    type="button" 
    className="round-action-btn border-0 p-0" 
    onClick={onClick} 
    disabled={disabled}
    style={{ 
      width: size, 
      height: size, 
      background: bg, 
      borderRadius: "50%", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      opacity: disabled ? 0.5 : 1,
      transition: "transform 0.1s active"
    }} 
    aria-label={label}
  >
    <i className={icon} style={{ color: iconColor, fontSize: size * 0.4 }} />
  </button>
);

export default function CenterBlock(props) {
  const {
    profilesLoading, apiError, profiles, profileIndex, currentProfile, getCurrentPhotoUrl,
    openPhotoModal, getCurrentProfilePhotos, currentPhotoIndex,
    goToPrevPhoto, goToNextPhoto, isMatched, isLiked, goToProfile,
    handlePass, handleLike, isAnimating, goToMessenger,
    openReportModal, handleBlock, centerCardStyle, reloadProfiles, swipeLimits
  } = props;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 992;

  // Render Guards
  if (profilesLoading && !currentProfile) return <div className="vh-100 d-flex align-items-center justify-content-center bg-black"><div className="spinner-border text-danger" /></div>;
  if (apiError || !profiles.length || !currentProfile) {
    return (
      <div className="vh-100 d-flex align-items-center justify-content-center p-4 text-center bg-black text-white">
        <div>
          <h4 className="mb-4">{apiError ? "Erreur de connexion" : "Plus de profils"}</h4>
          <button className="btn btn-primary rounded-pill px-5" onClick={reloadProfiles}>Rafraîchir</button>
        </div>
      </div>
    );
  }

  const photos = getCurrentProfilePhotos();
  const locationDisplay = currentProfile.location?.trim() || null;

  // Merge centerCardStyle (which contains the swipe transform animation)
  // For mobile: override background to black and remove box-shadow
  const containerStyle = isMobile 
    ? { ...centerCardStyle, background: '#000', boxShadow: 'none' }
    : { ...centerCardStyle, height: '100%' };

  return (
    <div 
      className="d-flex flex-column overflow-hidden" 
      style={containerStyle}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
          deltaX > 0 ? (!isAnimating && !isMatched(currentProfile?.id) && swipeLimits?.can_like !== false && handleLike()) : (!isAnimating && handlePass());
        }
      }}
    >
      {/* 1. FLEXIBLE PHOTO AREA */}
      <div className="position-relative flex-grow-1 overflow-hidden" onClick={() => openPhotoModal(getCurrentPhotoUrl(), currentProfile.id)}>
        <img 
          src={getCurrentPhotoUrl()} 
          alt={formatName(currentProfile)} 
          className="w-100 h-100" 
          style={{ objectFit: 'cover', position: 'absolute' }} 
        />
        
        {/* Story Indicators */}
        {photos.length > 1 && (
          <div className="position-absolute top-0 start-0 w-100 d-flex gap-1 p-2" style={{ zIndex: 10 }}>
            {photos.map((_, idx) => (
              <div key={idx} className="flex-grow-1" style={{ height: '3px', backgroundColor: idx === currentPhotoIndex ? '#fff' : 'rgba(255,255,255,0.3)', borderRadius: '2px' }} />
            ))}
          </div>
        )}

        {/* Photo navigation arrows - fully inside image, integrated */}
        {photos.length > 1 && (
          <>
            <button 
              className="photo-nav-arrow left" 
              onClick={(e) => { e.stopPropagation(); goToPrevPhoto(e); }}
              aria-label="Photo précédente"
            >
              <i className="fas fa-chevron-left" />
            </button>
            <button 
              className="photo-nav-arrow right" 
              onClick={(e) => { e.stopPropagation(); goToNextPhoto(e); }}
              aria-label="Photo suivante"
            >
              <i className="fas fa-chevron-right" />
            </button>
            <div className="photo-counter">{currentPhotoIndex + 1} / {photos.length}</div>
          </>
        )}

        {/* Bottom Fade */}
        <div className="position-absolute bottom-0 start-0 w-100" style={{ height: '30%', background: 'linear-gradient(to top, #000, transparent)' }} />
      </div>

      {/* 2. FIXED CONTENT AREA (Always stays in viewport) */}
      <div className="px-3 pb-3 pt-2 text-white" style={{ background: '#000', flexShrink: 0 }}>
        
        {/* Name & Location Row */}
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h2 className="fw-bold m-0 text-truncate" style={{ fontSize: '1.4rem' }}>
            {formatName(currentProfile)}{currentProfile.age ? `, ${currentProfile.age}` : ''}
          </h2>
          {locationDisplay && <span className="small opacity-75"><i className="fas fa-map-marker-alt me-1"/>{locationDisplay}</span>}
        </div>

        {/* Status Badges */}
        <div className="mb-2">
          {isMatched(currentProfile.id) && <span className="badge rounded-pill bg-danger me-2">Match</span>}
          {isLiked(currentProfile.id) && !isMatched(currentProfile.id) && <span className="badge rounded-pill bg-warning text-dark me-2">Aimé</span>}
        </div>

        {/* Bio: Clamped to 2 lines */}
        <p className="small mb-3 opacity-75" style={{ 
          display: '-webkit-box', 
          WebkitLineClamp: '2', 
          WebkitBoxOrient: 'vertical', 
          overflow: 'hidden',
          minHeight: '2.4em' 
        }}>
          {currentProfile.bio || "Pas encore de bio"}
        </p>

        {/* Interaction Bar */}
        <div className="d-flex justify-content-center align-items-center gap-4 py-2">
          {isMatched(currentProfile.id) ? (
            <>
              <RoundActionBtn onClick={handlePass} bg="rgba(255,255,255,0.1)" icon="fas fa-times" iconColor="#fff" size={50} />
              <RoundActionBtn onClick={() => goToMessenger(currentProfile.id)} bg="linear-gradient(135deg, #ff4d6d, #a158ff)" icon="fas fa-comment-dots" iconColor="#fff" size={62} />
              <RoundActionBtn onClick={() => goToProfile(currentProfile.id)} bg="rgba(255,255,255,0.1)" icon="fas fa-user" iconColor="#fff" size={50} />
            </>
          ) : (
            <>
              <button 
                onClick={handlePass} 
                className="btn border-2 rounded-circle d-flex align-items-center justify-content-center" 
                style={{ width: 56, height: 56, borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
              >
                <i className="fas fa-times fs-4"/>
              </button>
              
              <button 
                onClick={handleLike} 
                disabled={swipeLimits && !swipeLimits.can_like}
                className="btn rounded-circle shadow-lg d-flex align-items-center justify-content-center" 
                style={{ 
                  width: 76, height: 76, 
                  background: 'linear-gradient(145deg, #ff4d6d, #ff3355)', 
                  border: 'none',
                  opacity: (swipeLimits && !swipeLimits.can_like) ? 0.5 : 1
                }}
              >
                <i className="fas fa-heart text-white fs-2"/>
              </button>

              <button 
                onClick={() => goToProfile(currentProfile.id)} 
                className="btn border-2 rounded-circle d-flex align-items-center justify-content-center" 
                style={{ width: 56, height: 56, borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
              >
                <i className="fas fa-user fs-4"/>
              </button>
            </>
          )}
        </div>

        {/* Safety Tools */}
        {!isMatched(currentProfile.id) && (
          <div className="d-flex justify-content-center gap-4 mt-1 opacity-25">
             <button onClick={() => openReportModal(currentProfile)} className="btn btn-sm text-white p-0"><i className="fas fa-flag"/></button>
             <button onClick={() => handleBlock(currentProfile)} className="btn btn-sm text-white p-0"><i className="fas fa-ban"/></button>
          </div>
        )}
      </div>

      {/* Embedded styles for photo navigation – ensures buttons are inside picture, responsive */}
      <style>{`
        .photo-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: all 0.2s ease;
          color: white;
          font-size: 18px;
        }
        .photo-nav-arrow:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: translateY(-50%) scale(1.05);
        }
        .photo-nav-arrow.left {
          left: 12px;
        }
        .photo-nav-arrow.right {
          right: 12px;
        }
        .photo-counter {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          z-index: 20;
        }
        @media (max-width: 768px) {
          .photo-nav-arrow {
            width: 36px;
            height: 36px;
            font-size: 14px;
          }
          .photo-counter {
            top: 12px;
            right: 12px;
            font-size: 10px;
            padding: 3px 8px;
          }
        }
      `}</style>
    </div>
  );
}