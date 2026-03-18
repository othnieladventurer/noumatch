import React from "react";
import ReportModal from "./ReportModal";

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
              aria-label="Fermer"
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
            fontSize: "16px",
            background: "rgba(0,0,0,0.5)",
            padding: "6px 16px",
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
              borderRadius: "8px",
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

      {/* MODAL DES LIKES - Only visible for Premium and God Mode users */}
      {(user?.account_type === "premium" || user?.account_type === "god_mode") && (
        <ModalShell
          open={likeModalOpen}
          onClose={closeLikeModal}
          title=""
          overlay="rgba(0,0,0,0.60)"
          maxWidth={480}>
          {selectedLike && (
            <>
              <div className="modal-image-container mb-3" style={{ minHeight: "300px", maxHeight: "300px" }}>
                {selectedLike.photo ? (
                  <img 
                    src={selectedLike.photo} 
                    alt={selectedLike.first_name + " " + selectedLike.last_name || "Profil"}
                    onClick={() => {
                      closeLikeModal();
                      setTimeout(() => openPhotoModal(selectedLike.photo, selectedLike.id), 100);
                    }}
                    style={{ cursor: "pointer" }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML += '<div class="p-5 text-secondary">Photo non disponible</div>';
                    }}
                  />
                ) : (
                  <div className="p-5 text-secondary">Photo non disponible</div>
                )}
              </div>

              <div className="d-flex align-items-center justify-content-between mb-2">
                <h4 className="fw-bold mb-0 clickable-profile" onClick={() => {
                  closeLikeModal();
                  goToProfile(selectedLike.id);
                }}>
                  {selectedLike.first_name} {selectedLike.last_name}
                  {selectedLike.age ? `, ${selectedLike.age}` : ''}
                </h4>
                {isMatched(selectedLike.id) && (
                  <span className="status-badge matched-badge">Match</span>
                )}
              </div>

              <p className="text-secondary mb-3" style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{selectedLike.bio || "Pas encore de bio"}</p>

              {isMatched(selectedLike.id) ? (
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <RoundActionBtn
                    onClick={() => {
                      closeLikeModal();
                      goToProfile(selectedLike.id);
                    }}
                    bg="#ffffff"
                    border="1px solid #e9ecef"
                    icon="fas fa-user"
                    iconColor="#6f42c1"
                    label="Voir le profil"
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
                    label="Envoyer un message"
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
                </div>
              ) : (
                <div className="d-flex justify-content-center gap-2">
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
                    label="Aimer en retour"
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
                    label="Voir le profil"
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
                </div>
              )}
            </>
          )}
        </ModalShell>
      )}

      {/* MODAL DE MATCH - Visible to all users */}
      <ModalShell
        open={matchModalOpen}
        onClose={closeMatchModal}
        title=""
        maxWidth={640}
        overlay="rgba(0,0,0,0.60)">
        {matchedProfile && (
          <>
            <div
              className="text-center p-4 position-relative rounded-4 mb-4"
              style={{
                background: "linear-gradient(145deg, #fff5f7, #fff)",
              }}
            >
              <h2 className="fw-bold mb-2" style={{ fontSize: "2.5rem", background: "linear-gradient(145deg, #ff4d6d, #ff3355)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                🎉Nou Match!🎉
              </h2>

              <p className="text-secondary mb-4">
                Vous et <span className="fw-semibold text-dark clickable-profile" onClick={() => {
                  closeMatchModal();
                  goToProfile(matchedProfile.id);
                }}>{matchedProfile.first_name} {matchedProfile.last_name}</span> vous êtes mutuellement likés, démarrer une conversation n'a jamais été aussi simple !
              </p>

              <div className="d-flex align-items-center justify-content-center gap-4 mb-4">
                <div style={{ width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => {
                  closeMatchModal();
                  setTimeout(() => openPhotoModal(matchedProfile.photo, matchedProfile.id), 100);
                }}>
                  <img 
                    src={matchedProfile.photo || "https://via.placeholder.com/100"} 
                    alt={matchedProfile.first_name + " " + matchedProfile.last_name || "Profil"}
                    style={{ 
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                </div>
                <div className="text-start" style={{ minWidth: 0 }}>
                  <h4 className="fw-bold mb-1 text-truncate-custom clickable-profile" onClick={() => {
                    closeMatchModal();
                    goToProfile(matchedProfile.id);
                  }}>
                    {matchedProfile.first_name} {matchedProfile.last_name}
                    {matchedProfile.age ? `, ${matchedProfile.age}` : ''}
                  </h4>
                  <p className="text-secondary mb-0 text-truncate-custom" style={{ maxWidth: 300 }} title={matchedProfile.bio}>{matchedProfile.bio || "Pas encore de bio"}</p>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <RoundActionBtn
                onClick={() => {
                  closeMatchModal();
                  goToProfile(matchedProfile.id);
                }}
                bg="#ffffff"
                border="1px solid #e9ecef"
                icon="fas fa-user"
                iconColor="#6f42c1"
                label="Voir le profil"
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
                label="Envoyer un message"
              />

              <RoundActionBtn
                onClick={() => handleUnmatch(matchedProfile)}
                bg="#ffffff"
                border="1px solid #dc354530"
                icon="fas fa-heart-broken"
                iconColor="#dc3545"
                label="Annuler le match"
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

            <p className="text-center text-secondary small mt-3 mb-0">
              Que souhaitez-vous faire ensuite ?
            </p>
          </>
        )}
      </ModalShell>

      {/* MODAL DE DÉBLOCAGE - Visible to all users */}
      <ModalShell
        open={unblockModalOpen}
        onClose={closeUnblockModal}
        title=""
        maxWidth={480}
        overlay="rgba(0,0,0,0.60)">
        {selectedBlocked && (
          <>
            <div className="modal-image-container mb-3" style={{ minHeight: "200px", maxHeight: "200px" }}>
              {selectedBlocked.photo ? (
                <img 
                  src={selectedBlocked.photo} 
                  alt={selectedBlocked.first_name + " " + selectedBlocked.last_name || "Profil"}
                  onClick={() => {
                    closeUnblockModal();
                    setTimeout(() => openPhotoModal(selectedBlocked.photo, selectedBlocked.id), 100);
                  }}
                  style={{ cursor: "pointer" }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML += '<div class="p-5 text-secondary">Photo non disponible</div>';
                  }}
                />
              ) : (
                <div className="p-5 text-secondary">Photo non disponible</div>
              )}
            </div>

            <div className="text-center mb-4">
              <h4 className="fw-bold mb-2 clickable-profile" onClick={() => {
                closeUnblockModal();
                goToProfile(selectedBlocked.id);
              }}>
                {selectedBlocked.first_name} {selectedBlocked.last_name}
                {selectedBlocked.age ? `, ${selectedBlocked.age}` : ''}
              </h4>
              <p className="text-secondary mb-3">{selectedBlocked.bio || "Pas encore de bio"}</p>
              <p className="text-muted small">Cet utilisateur est actuellement bloqué</p>
            </div>

            <div className="d-flex justify-content-center gap-3">
              <RoundActionBtn
                onClick={() => handleUnblock(selectedBlocked)}
                bg="#28a745"
                border="none"
                icon="fas fa-check"
                iconColor="#ffffff"
                label="Débloquer"
              />
              <RoundActionBtn
                onClick={closeUnblockModal}
                bg="#6c757d"
                border="none"
                icon="fas fa-times"
                iconColor="#ffffff"
                label="Annuler"
              />
            </div>
          </>
        )}
      </ModalShell>
    </>
  );
}
