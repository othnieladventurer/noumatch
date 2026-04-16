import React, { useRef, useState, useEffect } from "react";
import { formatName } from "../utils/helpers";

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
    openReportModal, handleBlock, centerCardStyle, reloadProfiles, swipeLimits, user
  } = props;

  // FORCE CORRECT LIMITS FOR FREE ACCOUNTS
  // Use the backend's likes_today (count in last 12h) to compute remaining likes.
  // This ignores whatever broken daily_limit or likes_remaining the backend sends.
  const forcedLimit = 20;
  const forcedRemaining = (swipeLimits?.account_type === 'free' && swipeLimits?.likes_today !== undefined)
    ? Math.max(0, forcedLimit - swipeLimits.likes_today)
    : swipeLimits?.likes_remaining;
  const forcedCanLike = (swipeLimits?.account_type === 'free')
    ? forcedRemaining > 0
    : swipeLimits?.can_like;

  const [localLikesRemaining, setLocalLikesRemaining] = useState(forcedRemaining);
  const [localCanLike, setLocalCanLike] = useState(forcedCanLike);

  // Update local state when swipeLimits changes (e.g., after a like)
  useEffect(() => {
    if (swipeLimits?.account_type === 'free') {
      const newRemaining = Math.max(0, forcedLimit - (swipeLimits.likes_today || 0));
      setLocalLikesRemaining(newRemaining);
      setLocalCanLike(newRemaining > 0);
    } else {
      setLocalLikesRemaining(swipeLimits?.likes_remaining);
      setLocalCanLike(swipeLimits?.can_like);
    }
  }, [swipeLimits]);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 992;
  const [showTooltip, setShowTooltip] = useState(false);
  let tooltipTimeout;

  // Preload next profile image
  useEffect(() => {
    if (!currentProfile) return;
    const img = new Image();
    img.src = getCurrentPhotoUrl();
    img.fetchPriority = "high";
    const nextProfile = profiles[profileIndex + 1];
    if (nextProfile && nextProfile.profile_photo) {
      const nextImg = new Image();
      nextImg.src = nextProfile.profile_photo;
    }
  }, [currentProfile, profileIndex, profiles, getCurrentPhotoUrl]);

  const handleMouseEnter = () => {
    tooltipTimeout = setTimeout(() => setShowTooltip(true), 300);
  };
  const handleMouseLeave = () => {
    clearTimeout(tooltipTimeout);
    setShowTooltip(false);
  };

  const onLike = () => {
    if (!currentProfile || isAnimating || !localCanLike) return;
    // Optimistically decrement
    if (localLikesRemaining !== null && localLikesRemaining > 0) {
      const newRemaining = localLikesRemaining - 1;
      setLocalLikesRemaining(newRemaining);
      if (newRemaining === 0) setLocalCanLike(false);
    }
    handleLike(); // backend call (will also refresh swipeLimits)
  };

  const onPass = () => {
    if (!currentProfile || isAnimating) return;
    handlePass();
  };

  const inviteLink = user?.referral_code 
    ? `${window.location.origin}/signup?ref=${user.referral_code}`
    : `${window.location.origin}/signup`;

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert("Lien d'invitation copié ! Partagez-le avec vos amis.");
  };

  if (profilesLoading && !currentProfile) return <div className="vh-100 d-flex align-items-center justify-content-center bg-black"><div className="spinner-border text-danger" /></div>;
  if (apiError || !profiles.length || !currentProfile) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-4 text-center" style={{ minHeight: '100%', background: '#000', color: 'white' }}>
        <div className="mb-4">
          <i className="fas fa-users fa-3x mb-3" style={{ color: '#ff4d6d' }}></i>
          <h4 className="mb-3">Plus de profils pour le moment</h4>
          <p className="small opacity-75 mb-4">
            De nouveaux profils arrivent bientôt depuis notre liste d'attente.<br />
            Pour nous aider à grandir et débloquer plus de profils, invitez vos amis à rejoindre NouMatch !
          </p>
          <div className="d-flex flex-column gap-3 align-items-center">
            <button onClick={handleCopyInviteLink} className="btn btn-danger rounded-pill px-4 py-2" style={{ background: 'linear-gradient(145deg, #ff4d6d, #ff3355)', border: 'none' }}>
              <i className="fas fa-share-alt me-2"></i> Inviter un ami
            </button>
            <button onClick={reloadProfiles} className="btn btn-outline-light rounded-pill px-4 py-2">
              <i className="fas fa-sync-alt me-2"></i> Rafraîchir
            </button>
            <small className="text-muted mt-2">(Revenez dans environ 30 minutes)</small>
          </div>
        </div>
      </div>
    );
  }

  const photos = getCurrentProfilePhotos();
  const locationDisplay = currentProfile.location?.trim() || null;
  const currentImageUrl = getCurrentPhotoUrl();

  const containerStyle = isMobile 
    ? { ...centerCardStyle, background: '#000', boxShadow: 'none', touchAction: 'pan-y' }
    : { ...centerCardStyle, height: '100%', touchAction: 'pan-y' };

  return (
    <div 
      className="d-flex flex-column overflow-hidden" 
      style={containerStyle}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) {
            if (!isAnimating && !isMatched(currentProfile?.id) && localCanLike) onLike();
          } else {
            if (!isAnimating) onPass();
          }
        }
      }}
    >
      {/* PHOTO AREA */}
      <div className="position-relative flex-grow-1 overflow-hidden" onClick={() => openPhotoModal(currentImageUrl, currentProfile.id)}>
        <div style={{ position: 'absolute', width: '100%', height: '100%', background: '#1a1a1a' }} />
        <img 
          src={currentImageUrl} 
          alt={formatName(currentProfile)} 
          className="w-100 h-100" 
          style={{ objectFit: 'cover', position: 'absolute' }}
          fetchPriority="high"
          decoding="async"
        />
        
        {photos.length > 1 && (
          <div className="position-absolute top-0 start-0 w-100 d-flex gap-1 p-2" style={{ zIndex: 10 }}>
            {photos.map((_, idx) => (
              <div key={idx} className="flex-grow-1" style={{ height: '3px', backgroundColor: idx === currentPhotoIndex ? '#fff' : 'rgba(255,255,255,0.3)', borderRadius: '2px' }} />
            ))}
          </div>
        )}

        {photos.length > 1 && (
          <>
            <button className="photo-nav-arrow left" onClick={(e) => { e.stopPropagation(); goToPrevPhoto(e); }}><i className="fas fa-chevron-left" /></button>
            <button className="photo-nav-arrow right" onClick={(e) => { e.stopPropagation(); goToNextPhoto(e); }}><i className="fas fa-chevron-right" /></button>
            <div className="photo-counter">{currentPhotoIndex + 1} / {photos.length}</div>
          </>
        )}

        <div className="position-absolute bottom-0 start-0 w-100" style={{ height: '30%', background: 'linear-gradient(to top, #000, transparent)' }} />
      </div>

      {/* CONTENT AREA */}
      <div className="px-3 pb-3 pt-2 text-white" style={{ background: '#000', flexShrink: 0 }}>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h2 className="fw-bold m-0 text-truncate" style={{ fontSize: '1.4rem' }}>
            {formatName(currentProfile)}{currentProfile.age ? `, ${currentProfile.age}` : ''}
          </h2>
          {locationDisplay && <span className="small opacity-75"><i className="fas fa-map-marker-alt me-1"/>{locationDisplay}</span>}
        </div>

        <div className="mb-2">
          {isMatched(currentProfile.id) && <span className="badge rounded-pill bg-danger me-2">Match</span>}
          {isLiked(currentProfile.id) && !isMatched(currentProfile.id) && <span className="badge rounded-pill bg-warning text-dark me-2">Aimé</span>}
        </div>

        <p className="small mb-3 opacity-75" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em' }}>
          {currentProfile.bio || "Pas encore de bio"}
        </p>

        <div className="d-flex justify-content-center align-items-center gap-4 py-2">
          {isMatched(currentProfile.id) ? (
            <>
              <RoundActionBtn onClick={onPass} bg="rgba(255,255,255,0.1)" icon="fas fa-times" iconColor="#fff" size={50} />
              <RoundActionBtn onClick={() => goToMessenger(currentProfile.id)} bg="linear-gradient(135deg, #ff4d6d, #a158ff)" icon="fas fa-comment-dots" iconColor="#fff" size={62} />
              <RoundActionBtn onClick={() => goToProfile(currentProfile.id)} bg="rgba(255,255,255,0.1)" icon="fas fa-user" iconColor="#fff" size={50} />
            </>
          ) : (
            <>
              <button onClick={onPass} className="btn border-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>
                <i className="fas fa-times fs-4"/>
              </button>
              
              <button onClick={onLike} disabled={!localCanLike} className="btn rounded-circle shadow-lg d-flex align-items-center justify-content-center" style={{ width: 76, height: 76, background: 'linear-gradient(145deg, #ff4d6d, #ff3355)', border: 'none', opacity: localCanLike ? 1 : 0.5 }}>
                <i className="fas fa-heart text-white fs-2"/>
              </button>

              <button onClick={() => goToProfile(currentProfile.id)} className="btn border-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>
                <i className="fas fa-user fs-4"/>
              </button>
            </>
          )}
        </div>

        {/* SWIPE COUNTER - forced to show 20 limit for free accounts */}
        {!isMatched(currentProfile.id) && (
          swipeLimits?.account_type === 'free' ? (
            <div className="text-center small mt-1 d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
              <span>
                <i className="fas fa-heart me-1" style={{ fontSize: '0.6rem' }} />
                {localLikesRemaining} / 20 likes restants
              </span>
              <div className="position-relative d-inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <i className="fas fa-info-circle" style={{ cursor: 'pointer', fontSize: '0.7rem' }} />
                {showTooltip && (
                  <div className="tooltip-bubble">
                    C'est votre compteur quotidien. Soyez prudent(e) sur les profils que vous likez ou passez. Notre conseil : visitez le profil complètement avant de prendre une décision.
                  </div>
                )}
              </div>
            </div>
          ) : swipeLimits?.daily_limit && (
            <div className="text-center small mt-1 d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
              <span>
                <i className="fas fa-heart me-1" style={{ fontSize: '0.6rem' }} />
                {localLikesRemaining} / {swipeLimits.daily_limit} likes restants
              </span>
              <div className="position-relative d-inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <i className="fas fa-info-circle" style={{ cursor: 'pointer', fontSize: '0.7rem' }} />
                {showTooltip && (
                  <div className="tooltip-bubble">
                    C'est votre compteur quotidien. Soyez prudent(e) sur les profils que vous likez ou passez. Notre conseil : visitez le profil complètement avant de prendre une décision.
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {!isMatched(currentProfile.id) && (
          <div className="d-flex justify-content-center gap-4 mt-1 opacity-25">
             <button onClick={() => openReportModal(currentProfile)} className="btn btn-sm text-white p-0"><i className="fas fa-flag"/></button>
             <button onClick={() => handleBlock(currentProfile)} className="btn btn-sm text-white p-0"><i className="fas fa-ban"/></button>
          </div>
        )}
      </div>

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
        .photo-nav-arrow.left { left: 12px; }
        .photo-nav-arrow.right { right: 12px; }
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
        .tooltip-bubble {
          position: absolute;
          bottom: 150%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          color: white;
          font-size: 0.7rem;
          padding: 6px 12px;
          border-radius: 12px;
          white-space: nowrap;
          z-index: 100;
          width: max-content;
          max-width: 220px;
          white-space: normal;
          text-align: center;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .tooltip-bubble::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: rgba(0, 0, 0, 0.85) transparent transparent transparent;
        }
        @media (max-width: 768px) {
          .photo-nav-arrow { width: 36px; height: 36px; font-size: 14px; }
          .photo-counter { top: 12px; right: 12px; font-size: 10px; padding: 3px 8px; }
          .tooltip-bubble { max-width: 180px; font-size: 0.6rem; padding: 5px 10px; }
        }
      `}</style>
    </div>
  );
}