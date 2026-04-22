import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LikesSection({ user }) {
  const navigate = useNavigate();
  const [likesList, setLikesList] = useState([]);
  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [selectedLike, setSelectedLike] = useState(null);

  // Helper: get profile photo URL (copied from Dashboard)
  const getProfilePhotoUrl = (path) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith('http')) return path;
    if (path.startsWith('/media')) return `${import.meta.env.VITE_API_URL}${path}`;
    return `${import.meta.env.VITE_API_URL}${path}`;
  };

  // Helper: calculate age (copied from Dashboard)
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Fetch received likes from backend
  useEffect(() => {
    if (!user) return;

    const fetchReceivedLikes = async () => {
      const token = localStorage.getItem("access");
      if (!token) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/interactions/likes/received/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          // Transform to match expected profile format
          const likesProfiles = data.map(like => ({
            id: like.from_user.id,
            name: like.from_user.username,
            age: like.from_user.age,
            bio: like.from_user.bio || "No bio yet",
            photo: like.from_user.photo || "https://via.placeholder.com/150",
            location: like.from_user.location || "Location not specified",
            gender: like.from_user.gender,
            interested_in: like.from_user.interested_in,
            height: like.from_user.height,
            passions: like.from_user.passions,
            career: like.from_user.career,
            education: like.from_user.education,
            hobbies: like.from_user.hobbies,
            favorite_music: like.from_user.favorite_music,
            birth_date: like.from_user.birth_date,
          }));
          setLikesList(likesProfiles);
        }
      } catch (error) {
        console.error("Error fetching received likes:", error);
      }
    };

    fetchReceivedLikes();
  }, [user]);

  const openLikeModal = (profile) => {
    setSelectedLike(profile);
    setLikeModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLikeModal = () => {
    setLikeModalOpen(false);
    setSelectedLike(null);
    document.body.style.overflow = 'unset';
  };

  const handlePassFromLikeModal = () => {
    closeLikeModal();
  };

  const handleLikeBack = async () => {
    if (!selectedLike) return;

    const token = localStorage.getItem("access");
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/interactions/like/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to_user: selectedLike.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to like back");
      }

      const likeData = await response.json();
      // Remove this profile from likesList (optional, but keeps list clean)
      setLikesList(prev => prev.filter(p => p.id !== selectedLike.id));

      closeLikeModal();
    } catch (error) {
      console.error("Error liking back:", error);
      alert("Could not like back. Please try again.");
    }
  };

  // ===== Copied helper components from Dashboard =====

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
                aria-label="Close"
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

  const AvatarRow = ({ items, onClickAvatar }) => (
    <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
      {items.slice(0, 8).map((p) => (
        <button
          key={p.id}
          type="button"
          className="p-0 border-0 bg-transparent"
          onClick={() => onClickAvatar?.(p)}
          style={{ lineHeight: 0 }}
          aria-label="Open profile"
        >
          <div className="position-relative">
            <img
              src={p.photo}
              alt={p.name || ""}
              className="rounded-circle"
              width="42"
              height="42"
              style={{
                objectFit: "cover",
                border: "2px solid #fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                cursor: onClickAvatar ? "pointer" : "default",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            />
            {onClickAvatar && (
              <div className="position-absolute bottom-0 end-0 bg-primary rounded-circle p-1" style={{ width: 8, height: 8 }} />
            )}
          </div>
        </button>
      ))}

      {items.length > 8 && (
        <span className="badge bg-light text-dark rounded-pill px-3 py-2" style={{ fontSize: "0.85rem" }}>
          +{items.length - 8}
        </span>
      )}
    </div>
  );

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

  // SectionCard style (copied from Dashboard)
  const SectionCard = ({ title, count, children }) => (
    <div
      className="p-3 mt-3"
      style={{
        borderRadius: "20px",
        background: "linear-gradient(145deg, #ffffff, #f8f9fa)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-semibold" style={{ fontSize: "0.95rem", color: "#2c3e50" }}>{title}</span>
        <span className="badge rounded-pill" style={{ background: "#e9ecef", color: "#495057", padding: "6px 12px" }}>{count}</span>
      </div>
      {children}
    </div>
  );

  return (
    <>
      <SectionCard title="Likes You" count={likesList.length}>
        {likesList.length > 0 ? (
          <AvatarRow items={likesList} onClickAvatar={openLikeModal} />
        ) : (
          <div className="text-center py-4">
            <div className="text-secondary small">
              <i className="far fa-heart me-2" style={{ opacity: 0.5, fontSize: "1.2rem" }}></i>
              <div>No likes yet</div>
              <div className="mt-1" style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                When someone likes you, they'll appear here
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Likes Modal */}
      <ModalShell
        open={likeModalOpen}
        onClose={closeLikeModal}
        title={selectedLike ? `${selectedLike.name}, ${selectedLike.age}` : "Profile"}
        overlay="rgba(0,0,0,0.60)"
      >
        {selectedLike && (
          <>
            <div className="rounded-4 overflow-hidden shadow-sm mb-4">
              <img 
                src={selectedLike.photo} 
                alt={selectedLike.name} 
                className="w-100" 
                style={{ height: 360, objectFit: "cover" }}
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/400x500?text=No+Photo";
                }}
              />
            </div>

            <p className="text-secondary mb-4" style={{ fontSize: "1rem", lineHeight: 1.6 }}>{selectedLike.bio}</p>

            <div className="d-flex justify-content-center gap-3">
              <RoundActionBtn
                onClick={handlePassFromLikeModal}
                bg="#ffffff"
                border="1px solid #e9ecef"
                icon="fas fa-times"
                iconColor="#adb5bd"
                label="Pass"
              />
              <RoundActionBtn
                onClick={handleLikeBack}
                bg="linear-gradient(145deg, #ff4d6d, #ff3355)"
                border="none"
                icon="fas fa-heart"
                iconColor="#ffffff"
                label="Like back"
              />
              <RoundActionBtn
                onClick={() => {
                  closeLikeModal();
                  navigate(`/profile/${selectedLike.id}`);
                }}
                bg="#ffffff"
                border="1px solid #e9ecef"
                icon="fas fa-user"
                iconColor="#6f42c1"
                label="See profile"
              />
            </div>
          </>
        )}
      </ModalShell>
    </>
  );
}


