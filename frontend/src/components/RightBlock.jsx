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
      <div className="scrollable-card p-3">
        <div className="text-center py-4">
          <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-light" style={{ width: 60, height: 60 }}>
            <i className="fas fa-user-slash text-secondary" style={{ fontSize: "1.5rem" }} />
          </div>
          <p className="text-secondary small">Aucun profil sélectionné</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scrollable-card p-3">
      {/* Résumé du profil cliquable */}
      <div className="d-flex align-items-center gap-3 mb-3 clickable-profile" onClick={() => goToProfile(currentProfile.id)}>
        <img
          src={currentProfile.profile_photo || "https://via.placeholder.com/60"}
          alt={formatName(currentProfile) || "Profil"}
          className="rounded-circle shadow-sm"
          width="60"
          height="60"
          style={{ objectFit: "cover", border: "3px solid #fff" }}
        />
        <div>
          <div className="d-flex align-items-center">
            <h5 className="fw-bold mb-1">
              {formatName(currentProfile)}
              {currentProfile.age ? `, ${currentProfile.age}` : ''}
            </h5>
            {isMatched(currentProfile.id) && (
              <span className="status-badge matched-badge" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>Match</span>
            )}
            {!isMatched(currentProfile.id) && isLiked(currentProfile.id) && (
              <span className="status-badge liked-badge" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>Aimé</span>
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
          <span className="badge bg-light text-dark px-3 py-2">
            <i className="fas fa-images me-2"></i>
            {getCurrentProfilePhotos().length} photo{getCurrentProfilePhotos().length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="mb-3">
        <h6 className="fw-semibold mb-2" style={{ color: "#495057", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
          <i className="fas fa-info-circle me-2" />INFOS DE BASE
        </h6>
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="fas fa-venus-mars text-secondary flex-shrink-0" style={{ width: 20 }} />
            <span className="text-secondary small text-truncate-custom">
              {currentProfile.gender ? currentProfile.gender.charAt(0).toUpperCase() + currentProfile.gender.slice(1) : "Non spécifié"}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <i className="fas fa-heart text-secondary flex-shrink-0" style={{ width: 20 }} />
            <span className="text-secondary small text-truncate-custom">
              Intéressé par: {currentProfile.interested_in ? 
                (currentProfile.interested_in === 'male' ? 'Hommes' : 
                 currentProfile.interested_in === 'female' ? 'Femmes' : 'Tout le monde') 
                : "Non spécifié"}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <i className="fas fa-cake-candles text-secondary flex-shrink-0" style={{ width: 20 }} />
            <span className="text-secondary small text-truncate-custom">
              {currentProfile.birth_date ? calculateAge(currentProfile.birth_date) + " ans" : "Âge non spécifié"}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <i className="fas fa-ruler text-secondary flex-shrink-0" style={{ width: 20 }} />
            <span className="text-secondary small text-truncate-custom">
              {currentProfile.height ? `${currentProfile.height} cm` : "Taille non spécifiée"}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h6 className="fw-semibold mb-2" style={{ color: "#495057", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
          <i className="fas fa-briefcase me-2" />PROFESSION
        </h6>
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="fas fa-briefcase text-secondary flex-shrink-0" style={{ width: 20 }} />
            <span className="text-secondary small text-truncate-custom">{currentProfile.career || "Non spécifiée"}</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <i className="fas fa-graduation-cap text-secondary flex-shrink-0" style={{ width: 20 }} />
            <span className="text-secondary small text-truncate-custom">{currentProfile.education || "Non spécifiée"}</span>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h6 className="fw-semibold mb-2" style={{ color: "#495057", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
          <i className="fas fa-heart me-2" />PASSIONS & LOISIRS
        </h6>
        <div className="d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-2">
            <i className="fas fa-fire text-secondary flex-shrink-0" style={{ width: 20 }} />
            <span className="text-secondary small text-truncate-custom" title={currentProfile.passions}>
              {currentProfile.passions || "Non spécifiées"}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <i className="fas fa-pencil text-secondary flex-shrink-0" style={{ width: 20 }} />
            <span className="text-secondary small text-truncate-custom" title={currentProfile.hobbies}>
              {currentProfile.hobbies || "Non spécifiés"}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <h6 className="fw-semibold mb-2" style={{ color: "#495057", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
          <i className="fas fa-music me-2" />MUSIQUE
        </h6>
        <div className="d-flex align-items-center gap-2">
          <i className="fas fa-headphones text-secondary flex-shrink-0" style={{ width: 20 }} />
          <span className="text-secondary small text-truncate-custom" title={currentProfile.favorite_music}>
            {currentProfile.favorite_music || "Non spécifiée"}
          </span>
        </div>
      </div>
      
      {/* Bouton Message pour les utilisateurs matchés dans la barre latérale */}
      {isMatched(currentProfile.id) && (
        <div className="mt-2 text-center">
          <button
            onClick={() => goToMessenger(currentProfile.id)}
            className="btn w-100 py-2"
            style={{ 
              borderRadius: "30px", 
              background: "linear-gradient(145deg, #6f42c1, #5a32a3)",
              color: "white",
              border: "none",
              fontSize: "0.9rem"
            }}
          >
            <i className="fas fa-comment-dots me-2"></i>
            Envoyer un message
          </button>
        </div>
      )}
    </div>
  );
}
