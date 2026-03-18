import React from "react";
import { useNavigate } from "react-router-dom";

const RoundActionBtn = ({ onClick, bg, border, icon, iconColor, label }) => (
  <button
    type="button"
    className="btn rounded-circle shadow-sm d-flex align-items-center justify-content-center position-relative"
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
    <span 
      className="position-absolute" 
      style={{
        left: "50%",
        bottom: "calc(100% + 12px)",
        transform: "translateX(-50%) translateY(6px)",
        background: "#1a1a1a",
        color: "#fff",
        fontSize: "12px",
        fontWeight: 500,
        padding: "6px 12px",
        borderRadius: "20px",
        whiteSpace: "nowrap",
        opacity: 0,
        pointerEvents: "none",
        transition: "opacity 160ms ease, transform 160ms ease",
        boxShadow: "0 10px 22px rgba(0,0,0,0.25)",
        zIndex: 5,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.transform = "translateX(-50%) translateY(0)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0";
        e.currentTarget.style.transform = "translateX(-50%) translateY(6px)";
      }}
    >
      {label}
      <span
        style={{
          content: "",
          position: "absolute",
          left: "50%",
          top: "100%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid #1a1a1a",
        }}
      />
    </span>
  </button>
);

export default function MatchModal({ 
  isOpen, 
  onClose, 
  profile, 
  onUnmatch, 
  onBlock,
  onSendMessage 
}) {
  const navigate = useNavigate();

  if (!isOpen || !profile) return null;

  return (
    <>
      {/* Overlay */}
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
          background: "rgba(0,0,0,0.6)",
          zIndex: 999999,
          backdropFilter: "blur(4px)",
          margin: 0,
          padding: 0,
        }}
      />

      {/* Modal */}
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
            maxWidth: 640,
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
          <div className="p-4">
            <div
              className="text-center p-4 position-relative rounded-4 mb-4"
              style={{
                background: "linear-gradient(145deg, #fff5f7, #fff)",
              }}
            >
              <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle shadow"
                style={{
                  width: 100,
                  height: 100,
                  background: "linear-gradient(145deg, #ff4d6d20, #ff4d6d10)",
                  border: "3px solid #ff4d6d30",
                  animation: "pulse 1.8s infinite",
                }}
              >
                <i className="fas fa-heart" style={{ color: "#ff4d6d", fontSize: "2.5rem" }} />
              </div>

              <h2 className="fw-bold mb-2" style={{ 
                fontSize: "2.5rem", 
                background: "linear-gradient(145deg, #ff4d6d, #ff3355)", 
                WebkitBackgroundClip: "text", 
                WebkitTextFillColor: "transparent" 
              }}>
                It's a Match!
              </h2>

              <p className="text-secondary mb-4">
                You and <span className="fw-semibold text-dark">{profile.name}</span> liked each other
              </p>

              <div className="d-flex align-items-center justify-content-center gap-4 mb-4">
                <img 
                  src={profile.photo} 
                  alt={profile.name} 
                  className="rounded-circle shadow" 
                  width="100" 
                  height="100" 
                  style={{ objectFit: "cover", border: "4px solid #fff" }}
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/100";
                  }}
                />
                <div className="text-start" style={{ minWidth: 0 }}>
                  <h4 className="fw-bold mb-1" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {profile.name}, {profile.age}
                  </h4>
                  <p className="text-secondary mb-0" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }} title={profile.bio}>
                    {profile.bio}
                  </p>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <RoundActionBtn
                onClick={() => {
                  onClose();
                  navigate(`/profile/${profile.id}`);
                }}
                bg="#ffffff"
                border="1px solid #e9ecef"
                icon="fas fa-user"
                iconColor="#6f42c1"
                label="See Profile"
              />

              <RoundActionBtn
                onClick={() => {
                  onClose();
                  onSendMessage?.(profile);
                }}
                bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
                border="none"
                icon="fas fa-comment-dots"
                iconColor="#ffffff"
                label="Send Message"
              />

              <RoundActionBtn
                onClick={() => {
                  onClose();
                  onUnmatch(profile);
                }}
                bg="#ffffff"
                border="1px solid #dc354530"
                icon="fas fa-heart-broken"
                iconColor="#dc3545"
                label="Unmatch"
              />

              <RoundActionBtn
                onClick={() => {
                  onClose();
                  onBlock?.(profile);
                }}
                bg="#1a1a1a"
                border="none"
                icon="fas fa-ban"
                iconColor="#ffffff"
                label="Block"
              />
            </div>

            <p className="text-center text-secondary small mt-3 mb-0">
              What would you like to do next?
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
