import React from "react";
import { getProfilePhotoUrl, formatName } from "../utils/helpers";

const AvatarRow = ({ items, onClickAvatar }) => (
  <div className="avatar-row">
    {items.slice(0, 8).map((p) => {
      const displayName = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name || p.last_name || "";
      return (
        <button key={p.id} type="button" className="p-0 border-0 bg-transparent" onClick={() => onClickAvatar?.(p)} aria-label={displayName || "Ouvrir le profil"}>
          <img src={p.photo || "https://via.placeholder.com/52"} alt={displayName || "Utilisateur"} className="avatar-circle" />
        </button>
      );
    })}
    {items.length > 8 && <span className="badge bg-light text-dark rounded-pill px-3 py-2">+{items.length - 8}</span>}
  </div>
);

const SectionCard = ({ title, count, children }) => (
  <div className="p-3 mt-3" style={{ borderRadius: "20px", background: "linear-gradient(145deg, #ffffff, #f8f9fa)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
    <div className="d-flex justify-content-between align-items-center mb-2">
      <span className="fw-semibold" style={{ fontSize: "0.95rem", color: "#2c3e50" }}>{title}</span>
      <span className="badge rounded-pill" style={{ background: "#e9ecef", color: "#495057", padding: "6px 12px" }}>{count}</span>
    </div>
    {children}
  </div>
);

export default function LeftBlock({ user, likesList, matchesList, blockedList, openLikeModal, openMatchModalFor, openUnblockModal, goToMyProfile }) {
  const userPhoto = user?.profile_photo_url || user?.profile_photo;
  return (
    <div className="scrollable-card p-3">
      {/* Profile header */}
      <div className="d-flex align-items-center gap-3 clickable-profile" onClick={goToMyProfile}>
        <div className="position-relative flex-shrink-0">
          <img src={getProfilePhotoUrl(userPhoto) || "https://via.placeholder.com/70"} alt="profil" className="rounded-circle shadow-sm" width="70" height="70" style={{ objectFit: "cover", border: "3px solid #fff" }} />
          <div className="position-absolute bottom-0 end-0 bg-success rounded-circle p-2" style={{ width: 14, height: 14, border: "2px solid #fff" }} />
        </div>
        <div className="text-start flex-grow-1">
          <div className="fw-bold fs-5 text-truncate">{formatName(user)}</div>
          <div className="small text-secondary text-truncate">{user?.email}</div>
        </div>
      </div>
      <div className="mt-3" style={{ height: 1, background: "linear-gradient(90deg, transparent, #e9ecef, transparent)" }} />

      {/* Only Premium/God see likes */}
      {(user?.account_type === "premium" || user?.account_type === "god_mode") && (
        <SectionCard title="Qui vous aiment" count={likesList.length}>
          {likesList.length ? <AvatarRow items={likesList} onClickAvatar={openLikeModal} /> : <div className="text-center py-3 text-secondary small"><i className="far fa-heart me-2"></i>Aucun like</div>}
        </SectionCard>
      )}

      <SectionCard title="Matches" count={matchesList.length}>
        {matchesList.length ? <AvatarRow items={matchesList} onClickAvatar={openMatchModalFor} /> : <div className="text-center py-3 text-secondary small"><i className="fas fa-heart me-2"></i>Pas encore de matches</div>}
      </SectionCard>

      <SectionCard title="Bloqués" count={blockedList.length}>
        {blockedList.length ? <AvatarRow items={blockedList} onClickAvatar={openUnblockModal} /> : <div className="text-center py-3 text-secondary small"><i className="fas fa-ban me-2"></i>Aucun utilisateur bloqué</div>}
      </SectionCard>
    </div>
  );
}
