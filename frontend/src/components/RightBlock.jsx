import React from "react";
import { formatName, calculateAge, getProfilePhotoUrl } from "../utils/helpers";

export default function RightBlock({
  currentProfile,
  getCurrentProfilePhotos,
  isMatched,
  isLiked,
  goToProfile,
  goToMessenger
}) {
  if (!currentProfile) {
    return (
      <div className="p-4 text-center" style={{ backgroundColor: "#fff", borderRadius: "20px" }}>
        <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-light" style={{ width: 70, height: 70 }}>
          <i className="fas fa-user-slash text-secondary" style={{ fontSize: "2rem" }} />
        </div>
        <p className="text-secondary">Aucun profil sélectionné</p>
      </div>
    );
  }

  // Helper to get gender icon
  const getGenderIcon = () => {
    if (currentProfile.gender === "male") return "fas fa-mars";
    if (currentProfile.gender === "female") return "fas fa-venus";
    return "fas fa-genderless";
  };

  return (
    <div className="p-3" style={{ 
      backgroundColor: "#fff", 
      borderRadius: "20px", 
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      overflow: "visible",
      height: "auto",
      maxHeight: "none"
    }}>
      {/* Profile header */}
      <div className="d-flex align-items-center gap-3 mb-4 clickable-profile" onClick={() => goToProfile(currentProfile.id)} style={{ cursor: "pointer" }}>
        <img
          src={currentProfile.profile_photo || "https://via.placeholder.com/70"}
          alt={formatName(currentProfile) || "Profil"}
          className="rounded-circle shadow-sm"
          width="70"
          height="70"
          style={{ objectFit: "cover", border: "3px solid #ff8fa3" }}
        />
        <div>
          <div className="d-flex align-items-center flex-wrap">
            <h5 className="fw-bold mb-1 me-2">
              {formatName(currentProfile)}
              {currentProfile.age ? `, ${currentProfile.age}` : ""}
            </h5>
            {isMatched(currentProfile.id) && (
              <span className="badge bg-danger rounded-pill px-2 py-1" style={{ fontSize: "0.7rem" }}>
                <i className="fas fa-heart me-1" style={{ fontSize: "0.6rem" }} /> Match
              </span>
            )}
            {!isMatched(currentProfile.id) && isLiked(currentProfile.id) && (
              <span className="badge bg-warning text-dark rounded-pill px-2 py-1" style={{ fontSize: "0.7rem" }}>
                <i className="fas fa-thumbs-up me-1" style={{ fontSize: "0.6rem" }} /> Aimé
              </span>
            )}
          </div>
          <div className="small text-secondary">
            <i className="fas fa-map-marker-alt me-1" style={{ fontSize: "0.8rem" }} />
            {currentProfile.location || "Localisation non spécifiée"}
          </div>
        </div>
      </div>

      {/* Photo count indicator */}
      {getCurrentProfilePhotos().length > 1 && (
        <div className="mb-3 text-center">
          <span className="badge bg-light text-dark px-3 py-2 rounded-pill">
            <i className="fas fa-images me-2 text-danger" />
            {getCurrentProfilePhotos().length} photo{getCurrentProfilePhotos().length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Sections - removed any overflow scrolling */}
      <div className="mb-4">
        <h6 className="fw-semibold mb-3 pb-1 border-bottom" style={{ color: "#ff4d6d", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
          <i className="fas fa-info-circle me-2" /> INFOS DE BASE
        </h6>
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-3">
            <i className={`${getGenderIcon()} text-danger`} style={{ width: 20 }} />
            <span className="text-secondary small">
              {currentProfile.gender ? currentProfile.gender.charAt(0).toUpperCase() + currentProfile.gender.slice(1) : "Non spécifié"}
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <i className="fas fa-heart text-danger" style={{ width: 20 }} />
            <span className="text-secondary small">
              Genre recherché:{" "}
              {currentProfile.gender === "male"
                ? "Femmes"
                : currentProfile.gender === "female"
                ? "Hommes"
                : "Tout le monde"}
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <i className="fas fa-cake-candles text-danger" style={{ width: 20 }} />
            <span className="text-secondary small">
              {currentProfile.birth_date ? calculateAge(currentProfile.birth_date) + " ans" : "Âge non spécifié"}
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <i className="fas fa-ruler text-danger" style={{ width: 20 }} />
            <span className="text-secondary small">
              {currentProfile.height ? `${currentProfile.height} cm` : "Taille non spécifiée"}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h6 className="fw-semibold mb-3 pb-1 border-bottom" style={{ color: "#ff4d6d", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
          <i className="fas fa-briefcase me-2" /> PROFESSION
        </h6>
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-3">
            <i className="fas fa-briefcase text-danger" style={{ width: 20 }} />
            <span className="text-secondary small">{currentProfile.career || "Non spécifiée"}</span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <i className="fas fa-graduation-cap text-danger" style={{ width: 20 }} />
            <span className="text-secondary small">{currentProfile.education || "Non spécifiée"}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h6 className="fw-semibold mb-3 pb-1 border-bottom" style={{ color: "#ff4d6d", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
          <i className="fas fa-heart me-2" /> PASSIONS & LOISIRS
        </h6>
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-3">
            <i className="fas fa-fire text-danger" style={{ width: 20 }} />
            <span className="text-secondary small" title={currentProfile.passions}>
              {currentProfile.passions || "Non spécifiées"}
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <i className="fas fa-pencil text-danger" style={{ width: 20 }} />
            <span className="text-secondary small" title={currentProfile.hobbies}>
              {currentProfile.hobbies || "Non spécifiés"}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h6 className="fw-semibold mb-3 pb-1 border-bottom" style={{ color: "#ff4d6d", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
          <i className="fas fa-music me-2" /> MUSIQUE
        </h6>
        <div className="d-flex align-items-center gap-3">
          <i className="fas fa-headphones text-danger" style={{ width: 20 }} />
          <span className="text-secondary small" title={currentProfile.favorite_music}>
            {currentProfile.favorite_music || "Non spécifiée"}
          </span>
        </div>
      </div>

      {/* Message button for matched users */}
      {isMatched(currentProfile.id) && (
        <div className="mt-3 text-center">
          <button
            onClick={() => goToMessenger(currentProfile.id)}
            className="btn w-100 py-2"
            style={{
              borderRadius: "40px",
              background: "linear-gradient(145deg, #ff4d6d, #ff8fa3)",
              color: "white",
              border: "none",
              fontSize: "0.9rem",
              fontWeight: "500",
              transition: "transform 0.2s"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <i className="fas fa-comment-dots me-2"></i>
            Envoyer un message
          </button>
        </div>
      )}
    </div>
  );
}