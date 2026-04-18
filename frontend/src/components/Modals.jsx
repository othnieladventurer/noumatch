import React from "react";
import ReportModal from "./ReportModal";

const ModalShell = ({ open, onClose, title, children, maxWidth = 520, overlay = "rgba(0,0,0,0.60)", noPadding = false }) => {
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
            borderRadius: 32,
            overflow: "hidden",
            border: "none",
            background: "#ffffff",
            animation: "modalFadeIn 0.25s ease-out",
            pointerEvents: "auto",
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            margin: 0,
          }}
        >
          {title && (
            <div className="modal-header-custom" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px",
              background: "#ffffff",
            }}>
              <div className="fw-bold fs-5">{title}</div>
              <button
                className="close-btn"
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#f0f0f0",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#e0e0e0"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#f0f0f0"}
              >
                <i className="fas fa-times" style={{ color: "#666", fontSize: "1rem" }} />
              </button>
            </div>
          )}
          <div style={{ padding: noPadding ? 0 : "24px" }}>{children}</div>
        </div>
      </div>
    </>
  );
};

const RoundActionBtn = ({ onClick, bg, border, icon, iconColor, label }) => (
  <button
    type="button"
    className="round-action-btn"
    onClick={onClick}
    style={{
      width: 56,
      height: 56,
      borderRadius: "50%",
      background: bg,
      border: border || "none",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      position: "relative",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "scale(1.05)";
      e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.boxShadow = "none";
    }}
    aria-label={label}
  >
    <i className={icon} style={{ color: iconColor, fontSize: "1.2rem" }} />
    <span className="round-tooltip">{label}</span>
  </button>
);

const PhotoModal = ({ 
  photoModalOpen, 
  closePhotoModal, 
  modalPhotos, 
  modalPhotoIndex, 
  setModalPhotoIndex, 
  selectedPhoto, 
  setSelectedPhoto 
}) => {
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
          zIndex: 1000000,
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
          zIndex: 1000001,
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
                  background: "rgba(255,255,255,0.8)",
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
                  background: "rgba(255,255,255,0.8)",
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
            fontSize: "14px",
            background: "rgba(0,0,0,0.6)",
            padding: "4px 12px",
            borderRadius: "20px",
          }}>
            {modalPhotoIndex + 1} / {modalPhotos.length}
          </div>
          
          <img
            src={selectedPhoto}
            alt="Plein écran"
            style={{
              maxWidth: "100%",
              maxHeight: "95vh",
              objectFit: "contain",
              borderRadius: "12px",
              boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      </div>
    </>
  );
};

export default function Modals({
  user,
  likeModalOpen,
  closeLikeModal,
  selectedLike,
  openPhotoModal,
  isMatched,
  goToProfile,
  goToMessenger,
  handleUnlikeFromModal,
  handleBlock,
  openReportModal,
  handlePassFromLikeModal,
  handleLikeBack,
  matchModalOpen,
  closeMatchModal,
  matchedProfile,
  handleUnmatch,
  unblockModalOpen,
  closeUnblockModal,
  selectedBlocked,
  handleUnblock,
  photoModalOpen,
  closePhotoModal,
  modalPhotos,
  modalPhotoIndex,
  setModalPhotoIndex,
  selectedPhoto,
  setSelectedPhoto,
  reportModalOpen,
  closeReportModal,
  userToReport
}) {
  return (
    <>
      <PhotoModal 
        photoModalOpen={photoModalOpen}
        closePhotoModal={closePhotoModal}
        modalPhotos={modalPhotos}
        modalPhotoIndex={modalPhotoIndex}
        setModalPhotoIndex={setModalPhotoIndex}
        selectedPhoto={selectedPhoto}
        setSelectedPhoto={setSelectedPhoto}
      />
      
      <ReportModal 
        isOpen={reportModalOpen}
        onClose={closeReportModal}
        reportedUser={userToReport}
      />

      {/* MODAL DES LIKES */}
      {(user?.account_type === "premium" || user?.account_type === "god_mode") && (
        <ModalShell
          open={likeModalOpen}
          onClose={closeLikeModal}
          title=""
          overlay="rgba(0,0,0,0.60)"
          maxWidth={480}
          noPadding>
          {selectedLike && (
            <div className="like-modal-content">
              <div className="like-image-container">
                {selectedLike.photo ? (
                  <img 
                    src={selectedLike.photo} 
                    alt={selectedLike.first_name + " " + selectedLike.last_name || "Profil"}
                    onClick={() => {
                      closeLikeModal();
                      setTimeout(() => openPhotoModal(selectedLike.photo, selectedLike.id), 100);
                    }}
                  />
                ) : (
                  <div className="no-photo-placeholder">Photo non disponible</div>
                )}
              </div>

              <div className="like-info">
                <div className="like-header">
                  <h3 className="like-name" onClick={() => {
                    closeLikeModal();
                    goToProfile(selectedLike.id);
                  }}>
                    {selectedLike.first_name} {selectedLike.last_name}
                    {selectedLike.age ? `, ${selectedLike.age}` : ''}
                  </h3>
                  {isMatched(selectedLike.id) && (
                    <span className="match-badge">Match</span>
                  )}
                </div>

                <p className="like-bio">{selectedLike.bio || "Pas encore de bio"}</p>

                <div className="like-actions">
                  {isMatched(selectedLike.id) ? (
                    <>
                      <RoundActionBtn
                        onClick={() => {
                          closeLikeModal();
                          goToProfile(selectedLike.id);
                        }}
                        bg="#ffffff"
                        border="1px solid #e9ecef"
                        icon="fas fa-user"
                        iconColor="#6f42c1"
                        label="Profil"
                      />
                      <RoundActionBtn
                        onClick={() => {
                          closeLikeModal();
                          goToMessenger(selectedLike.id);
                        }}
                        bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
                        border="none"
                        icon="fas fa-comment-dots"
                        iconColor="#ffffff"
                        label="Message"
                      />
                      <RoundActionBtn
                        onClick={() => handleUnlikeFromModal()}
                        bg="#dc3545"
                        border="none"
                        icon="fas fa-heart-broken"
                        iconColor="#ffffff"
                        label="Unlike"
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
                        label="Bloquer"
                      />
                      <RoundActionBtn
                        onClick={() => {
                          closeLikeModal();
                          openReportModal(selectedLike);
                        }}
                        bg="#ffffff"
                        border="1px solid #ffc107"
                        icon="fas fa-flag"
                        iconColor="#ffc107"
                        label="Signaler"
                      />
                    </>
                  ) : (
                    <>
                      <RoundActionBtn
                        onClick={handlePassFromLikeModal}
                        bg="#ffffff"
                        border="1px solid #e9ecef"
                        icon="fas fa-times"
                        iconColor="#adb5bd"
                        label="Passer"
                      />
                      <RoundActionBtn
                        onClick={handleLikeBack}
                        bg="linear-gradient(145deg, #ff4d6d, #ff3355)"
                        border="none"
                        icon="fas fa-heart"
                        iconColor="#ffffff"
                        label="Aimer"
                      />
                      <RoundActionBtn
                        onClick={() => {
                          closeLikeModal();
                          goToProfile(selectedLike.id);
                        }}
                        bg="#ffffff"
                        border="1px solid #e9ecef"
                        icon="fas fa-user"
                        iconColor="#6f42c1"
                        label="Profil"
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
                        label="Bloquer"
                      />
                      <RoundActionBtn
                        onClick={() => {
                          closeLikeModal();
                          openReportModal(selectedLike);
                        }}
                        bg="#ffffff"
                        border="1px solid #ffc107"
                        icon="fas fa-flag"
                        iconColor="#ffc107"
                        label="Signaler"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </ModalShell>
      )}

      {/* MATCH MODAL - Redesigned with Round Buttons */}
      <ModalShell
        open={matchModalOpen}
        onClose={closeMatchModal}
        title=""
        maxWidth={560}
        overlay="rgba(0,0,0,0.60)"
        noPadding>
        {matchedProfile && (
          <div className="match-modal-content">
            <button className="match-close-btn" onClick={closeMatchModal}>
              <i className="fas fa-times" />
            </button>
            
            <div className="match-hero-section">
              <div className="match-icon">
                <i className="fas fa-heart" />
              </div>
              <h2 className="match-title">🎉NouMatch !🎉</h2>
              <p className="match-subtitle">
                Vous avez matché avec <strong onClick={() => {
                  closeMatchModal();
                  goToProfile(matchedProfile.id);
                }}>{matchedProfile.first_name} {matchedProfile.last_name}</strong>
              </p>
              <p className="text-muted small mt-2">
                💪 Envoyez-lui un message et lancez la discussion
              </p>
            </div>

            <div className="match-profile-section">
              <div className="match-avatar" onClick={() => {
                closeMatchModal();
                setTimeout(() => openPhotoModal(matchedProfile.photo, matchedProfile.id), 100);
              }}>
                <img 
                  src={matchedProfile.photo || "https://via.placeholder.com/100"} 
                  alt={matchedProfile.first_name + " " + matchedProfile.last_name}
                />
              </div>
              <div className="match-profile-details">
                <h3 className="match-profile-name">{matchedProfile.first_name} {matchedProfile.last_name}{matchedProfile.age ? `, ${matchedProfile.age}` : ''}</h3>
                <p className="match-profile-bio">{matchedProfile.bio || "Pas encore de bio"}</p>
              </div>
            </div>

            <div className="match-actions-round">
              <RoundActionBtn
                onClick={() => {
                  closeMatchModal();
                  goToProfile(matchedProfile.id);
                }}
                bg="#ffffff"
                border="1px solid #e9ecef"
                icon="fas fa-user"
                iconColor="#6f42c1"
                label="Profil"
              />
              <RoundActionBtn
                onClick={() => {
                  closeMatchModal();
                  goToMessenger(matchedProfile.id);
                }}
                bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
                border="none"
                icon="fas fa-comment-dots"
                iconColor="#ffffff"
                label="Message"
              />
              <RoundActionBtn
                onClick={() => handleUnmatch(matchedProfile)}
                bg="#ffffff"
                border="1px solid #dc354530"
                icon="fas fa-heart-broken"
                iconColor="#dc3545"
                label="Annuler"
              />
              <RoundActionBtn
                onClick={() => {
                  closeMatchModal();
                  openReportModal(matchedProfile);
                }}
                bg="#ffffff"
                border="1px solid #ffc107"
                icon="fas fa-flag"
                iconColor="#ffc107"
                label="Signaler"
              />
              <RoundActionBtn
                onClick={() => handleBlock(matchedProfile)}
                bg="#1a1a1a"
                border="none"
                icon="fas fa-ban"
                iconColor="#ffffff"
                label="Bloquer"
              />
            </div>

            <p className="match-footer-text">Que souhaitez-vous faire ?</p>
          </div>
        )}
      </ModalShell>

      {/* UNBLOCK MODAL */}
      <ModalShell
        open={unblockModalOpen}
        onClose={closeUnblockModal}
        title=""
        maxWidth={420}
        overlay="rgba(0,0,0,0.60)"
        noPadding>
        {selectedBlocked && (
          <div className="unblock-modal-content">
            <div className="unblock-avatar" onClick={() => {
              closeUnblockModal();
              setTimeout(() => openPhotoModal(selectedBlocked.photo, selectedBlocked.id), 100);
            }}>
              {selectedBlocked.photo ? (
                <img src={selectedBlocked.photo} alt={selectedBlocked.first_name} />
              ) : (
                <div className="no-avatar">📷</div>
              )}
            </div>
            
            <h3 className="unblock-name">{selectedBlocked.first_name} {selectedBlocked.last_name}{selectedBlocked.age ? `, ${selectedBlocked.age}` : ''}</h3>
            <p className="unblock-bio">{selectedBlocked.bio || "Pas encore de bio"}</p>
            <p className="unblock-warning">⚠️ Cet utilisateur est actuellement bloqué</p>
            
            <div className="unblock-actions">
              <button className="unblock-confirm-btn" onClick={() => handleUnblock(selectedBlocked)}>
                <i className="fas fa-check" />
                Débloquer
              </button>
              <button className="unblock-cancel-btn" onClick={closeUnblockModal}>
                <i className="fas fa-times" />
                Annuler
              </button>
            </div>
          </div>
        )}
      </ModalShell>

      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Tooltip styles */
        .round-tooltip {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 10px);
          transform: translateX(-50%) translateY(6px);
          background: #1a1a1a;
          color: #fff;
          font-size: 11px;
          font-weight: 500;
          padding: 5px 10px;
          border-radius: 16px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 160ms ease, transform 160ms ease;
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
          z-index: 10;
        }
        
        .round-tooltip::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid #1a1a1a;
        }
        
        .round-action-btn:hover .round-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        /* LIKE MODAL STYLES */
        .like-modal-content {
          display: flex;
          flex-direction: column;
        }
        
        .like-image-container {
          height: 320px;
          overflow: hidden;
          background: #f8f9fa;
        }
        
        .like-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
        }
        
        .no-photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #adb5bd;
        }
        
        .like-info {
          padding: 20px;
        }
        
        .like-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .like-name {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          cursor: pointer;
          color: #212529;
        }
        
        .like-name:hover {
          text-decoration: underline;
        }
        
        .match-badge {
          background: linear-gradient(145deg, #ff4d6d, #ff3355);
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        
        .like-bio {
          color: #6c757d;
          font-size: 0.85rem;
          margin-bottom: 20px;
          line-height: 1.4;
        }
        
        .like-actions {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* MATCH MODAL STYLES - REDESIGNED with Round Buttons */
        .match-modal-content {
          position: relative;
          padding: 32px 28px 36px;
        }
        
        .match-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f0f0f0;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #666;
        }
        
        .match-close-btn:hover {
          background: #e0e0e0;
        }
        
        .match-hero-section {
          text-align: center;
          margin-bottom: 28px;
        }
        
        .match-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(145deg, #ff4d6d, #ff3355);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          animation: pulse 1.5s infinite;
        }
        
        .match-icon i {
          font-size: 2.5rem;
          color: white;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 51, 85, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(255, 51, 85, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 51, 85, 0); }
        }
        
        .match-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0 0 8px;
          background: linear-gradient(145deg, #ff4d6d, #ff3355);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .match-subtitle {
          color: #6c757d;
          font-size: 0.9rem;
          margin: 0;
        }
        
        .match-subtitle strong {
          color: #212529;
          cursor: pointer;
        }
        
        .match-subtitle strong:hover {
          text-decoration: underline;
        }
        
        .match-profile-section {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #f8f9fa;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 28px;
        }
        
        .match-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          cursor: pointer;
          flex-shrink: 0;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .match-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .match-profile-details {
          flex: 1;
          min-width: 0;
        }
        
        .match-profile-name {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 4px;
          color: #212529;
        }
        
        .match-profile-bio {
          font-size: 0.8rem;
          color: #6c757d;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .match-actions-round {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        
        .match-footer-text {
          text-align: center;
          color: #adb5bd;
          font-size: 0.7rem;
          margin: 0;
        }

        /* UNBLOCK MODAL STYLES */
        .unblock-modal-content {
          text-align: center;
          padding: 32px 24px;
        }
        
        .unblock-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          overflow: hidden;
          margin: 0 auto 16px;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .unblock-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .no-avatar {
          font-size: 2.5rem;
        }
        
        .unblock-name {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 8px;
        }
        
        .unblock-bio {
          color: #6c757d;
          font-size: 0.85rem;
          margin: 0 0 12px;
        }
        
        .unblock-warning {
          background: #fff3cd;
          color: #856404;
          font-size: 0.75rem;
          padding: 8px 12px;
          border-radius: 12px;
          margin: 0 0 24px;
        }
        
        .unblock-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .unblock-confirm-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 40px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .unblock-confirm-btn:hover {
          background: #218838;
          transform: translateY(-1px);
        }
        
        .unblock-cancel-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 40px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .unblock-cancel-btn:hover {
          background: #5a6268;
          transform: translateY(-1px);
        }

        /* RESPONSIVE */
        @media (max-width: 576px) {
          .match-modal-content {
            padding: 24px 20px 28px;
          }
          
          .match-icon {
            width: 60px;
            height: 60px;
          }
          
          .match-icon i {
            font-size: 1.8rem;
          }
          
          .match-title {
            font-size: 1.4rem;
          }
          
          .match-subtitle {
            font-size: 0.75rem;
          }
          
          .match-profile-section {
            padding: 12px;
            gap: 12px;
          }
          
          .match-avatar {
            width: 60px;
            height: 60px;
          }
          
          .match-profile-name {
            font-size: 0.85rem;
          }
          
          .match-profile-bio {
            font-size: 0.7rem;
          }
          
          .match-actions-round {
            gap: 8px;
          }
          
          .round-action-btn {
            width: 48px !important;
            height: 48px !important;
          }
          
          .round-action-btn i {
            font-size: 1rem !important;
          }
          
          .like-image-container {
            height: 250px;
          }
          
          .like-info {
            padding: 16px;
          }
          
          .like-name {
            font-size: 1rem;
          }
          
          .like-bio {
            font-size: 0.75rem;
          }
          
          .like-actions {
            gap: 6px;
          }
          
          .unblock-modal-content {
            padding: 24px 20px;
          }
          
          .unblock-avatar {
            width: 80px;
            height: 80px;
          }
          
          .unblock-name {
            font-size: 1rem;
          }
          
          .unblock-bio {
            font-size: 0.75rem;
          }
          
          .unblock-confirm-btn, .unblock-cancel-btn {
            padding: 8px 18px;
            font-size: 0.8rem;
          }
        }
        
        @media (max-width: 480px) {
          .like-actions {
            gap: 4px;
          }
          
          .round-action-btn {
            width: 42px !important;
            height: 42px !important;
          }
          
          .match-actions-round {
            gap: 6px;
          }
        }
      `}</style>
    </>
  );
}