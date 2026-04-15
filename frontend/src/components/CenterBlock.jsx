import React, { useRef } from "react";
import { formatName } from "../utils/helpers";

const RoundActionBtn = ({ onClick, bg, border, icon, iconColor, label }) => (
  <button type="button" className="round-action-btn position-relative" onClick={onClick} style={{ width: 64, height: 64, background: bg, border: border || "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label={label}>
    <i className={icon} style={{ color: iconColor, fontSize: "1.3rem" }} />
    <span className="round-tooltip" style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "white", fontSize: "11px", padding: "4px 8px", borderRadius: "16px", whiteSpace: "nowrap", opacity: 0, pointerEvents: "none", transition: "opacity 0.2s" }}>{label}</span>
  </button>
);

export default function CenterBlock(props) {
  // All destructured props remain exactly the same as in original file
  const {
    profilesLoading, apiError, profiles, profileIndex, currentProfile, getCurrentPhotoUrl,
    openPhotoModal, getCurrentProfilePhotos, currentPhotoIndex, setCurrentPhotoIndex,
    goToPrevPhoto, goToNextPhoto, isPhotoAnimating, isMatched, isLiked, goToProfile,
    handlePass, handleLike, isAnimating, goToMessenger, setMatchedProfile, setMatchModalOpen,
    openReportModal, handleBlock, centerCardStyle, reloadProfiles, swipeLimits
  } = props;

  // Swipe detection (unchanged)
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
    if (Math.abs(deltaX) < minSwipeDistance || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX > 0) {
      if (!isAnimating && !isMatched(currentProfile?.id) && swipeLimits?.can_like !== false) handleLike();
    } else {
      if (!isAnimating) handlePass();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
    touchStartY.current = 0;
    touchEndY.current = 0;
  };

  // Loading and error states (unchanged)
  if (profilesLoading && !currentProfile) return <div className="h-100 d-flex align-items-center justify-content-center"><div className="text-center"><div className="spinner-border text-primary mb-3"/><div className="text-secondary">Chargement...</div></div></div>;
  if (apiError) return <div className="h-100 d-flex align-items-center justify-content-center"><div className="text-center p-4"><div className="mx-auto mb-4 bg-danger bg-opacity-10 rounded-circle" style={{ width:80,height:80,display:'flex',alignItems:'center',justifyContent:'center'}}><i className="fas fa-exclamation-triangle text-danger fs-1"/></div><h5 className="fw-bold mb-2">Erreur</h5><p className="text-secondary mb-3">{apiError}</p><button className="btn btn-outline-primary" onClick={reloadProfiles}>Réessayer</button></div></div>;
  if (!profiles.length || profileIndex >= profiles.length || !currentProfile) return <div className="h-100 d-flex align-items-center justify-content-center"><div className="text-center p-4"><div className="mx-auto mb-4 rounded-circle bg-danger bg-opacity-10" style={{width:100,height:100,display:'flex',alignItems:'center',justifyContent:'center'}}><i className="fas fa-heart fs-1 text-danger"/></div><h4 className="fw-bold mb-2">Plus de profils</h4><p className="text-secondary mb-4">Revenez plus tard !</p><button className="btn btn-primary rounded-pill px-5 py-2" style={{background:'#ff4d6d',border:'none'}} onClick={reloadProfiles}>Rafraîchir</button></div></div>;

  const locationDisplay = currentProfile.location?.trim() || null;
  const mobileCardStyle = isMobile ? { ...centerCardStyle, borderRadius: "0px", boxShadow: "none", overflow: "visible" } : centerCardStyle;

  return (
    <div className="center-card" style={mobileCardStyle} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* Photo gallery */}
      <div className="image-container position-relative" onClick={() => openPhotoModal(getCurrentPhotoUrl(), currentProfile.id)}>
        {getCurrentPhotoUrl() ? (
          <>
            <img src={getCurrentPhotoUrl()} alt={formatName(currentProfile)} style={{ width: '100%', height: 'auto', display: 'block' }} />
            {getCurrentProfilePhotos().length > 1 && (
              <>
                <div className="photo-indicators">
                  {getCurrentProfilePhotos().map((_, idx) => <div key={idx} className={`photo-dot ${idx === currentPhotoIndex ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(idx); }} />)}
                </div>
                <button className="photo-nav-arrow left" onClick={(e) => { e.stopPropagation(); goToPrevPhoto(e); }} disabled={isPhotoAnimating}><i className="fas fa-chevron-left"/></button>
                <button className="photo-nav-arrow right" onClick={(e) => { e.stopPropagation(); goToNextPhoto(e); }} disabled={isPhotoAnimating}><i className="fas fa-chevron-right"/></button>
                <div className="photo-counter">{currentPhotoIndex+1} / {getCurrentProfilePhotos().length}</div>
              </>
            )}
          </>
        ) : <div className="p-5 text-secondary">Photo non disponible</div>}
      </div>

      {/* Content */}
      <div className="card-content p-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <h2 className="fw-bold mb-0 clickable-profile" onClick={() => goToProfile(currentProfile.id)}>{formatName(currentProfile)}{currentProfile.age ? `, ${currentProfile.age}` : ''}</h2>
            {isMatched(currentProfile.id) && <span className="badge bg-danger rounded-pill">Match</span>}
            {!isMatched(currentProfile.id) && isLiked(currentProfile.id) && <span className="badge bg-warning text-dark rounded-pill">Aimé</span>}
          </div>
          {locationDisplay && <div className="text-secondary small"><i className="fas fa-map-marker-alt me-1"/>{locationDisplay}</div>}
        </div>
        <p className="text-secondary mb-4">{currentProfile.bio || "Pas encore de bio"}</p>

        {swipeLimits && !swipeLimits.can_like && <div className="alert alert-warning text-center py-2 mb-3 small"><i className="fas fa-info-circle me-2"/>Limite quotidienne de likes atteinte ({swipeLimits.likes_today}/{swipeLimits.daily_limit})</div>}

        {isMatched(currentProfile.id) ? (
          <div className="d-flex justify-content-center gap-3 flex-wrap mt-3">
            <button onClick={handlePass} disabled={isAnimating} className="btn rounded-circle shadow d-flex align-items-center justify-content-center" style={{ width:60,height:60,background:'#fff',border:'1px solid #e9ecef' }}><i className="fas fa-times" style={{color:'#adb5bd',fontSize:'1.3rem'}}/></button>
            <RoundActionBtn onClick={() => goToProfile(currentProfile.id)} bg="#fff" border="1px solid #e9ecef" icon="fas fa-user" iconColor="#6f42c1" label="Voir le profil"/>
            <RoundActionBtn onClick={() => goToMessenger(currentProfile.id)} bg="linear-gradient(145deg, #6f42c1, #5a32a3)" icon="fas fa-comment-dots" iconColor="#fff" label="Envoyer un message"/>
            <RoundActionBtn onClick={() => { setMatchedProfile(currentProfile); setMatchModalOpen(true); }} bg="#fff" border="1px solid #dc354530" icon="fas fa-heart-broken" iconColor="#dc3545" label="Annuler le match"/>
            <RoundActionBtn onClick={() => openReportModal(currentProfile)} bg="#fff" border="1px solid #ffc107" icon="fas fa-flag" iconColor="#ffc107" label="Signaler"/>
            <RoundActionBtn onClick={() => handleBlock(currentProfile)} bg="#1a1a1a" icon="fas fa-ban" iconColor="#fff" label="Bloquer"/>
          </div>
        ) : (
          <div className="d-flex justify-content-center gap-3 mt-3">
            <button onClick={handlePass} disabled={isAnimating} className="btn rounded-circle shadow d-flex align-items-center justify-content-center" style={{ width:60,height:60,background:'#fff',border:'1px solid #e9ecef' }}><i className="fas fa-times" style={{color:'#adb5bd',fontSize:'1.3rem'}}/></button>
            <button onClick={handleLike} disabled={isAnimating || (swipeLimits && !swipeLimits.can_like)} className="btn rounded-circle shadow d-flex align-items-center justify-content-center" style={{ width:74,height:74,background:'linear-gradient(145deg, #ff4d6d, #ff3355)', border:'none', opacity: (swipeLimits && !swipeLimits.can_like) ? 0.5 : 1 }}><i className="fas fa-heart" style={{color:'#fff',fontSize:'1.6rem'}}/></button>
            <button onClick={() => goToProfile(currentProfile.id)} disabled={isAnimating} className="btn rounded-circle shadow d-flex align-items-center justify-content-center" style={{ width:60,height:60,background:'#fff',border:'1px solid #e9ecef' }}><i className="fas fa-user" style={{color:'#6f42c1',fontSize:'1.2rem'}}/></button>
          </div>
        )}
      </div>
    </div>
  );
}