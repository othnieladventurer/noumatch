import React from "react";
import { useNavigate } from "react-router-dom";

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

export default function UnmatchModal({ isOpen, onClose, profile, onConfirm }) {
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
            maxWidth: 400,
            borderRadius: 28,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "#ffffff",
            animation: "modalFadeIn 0.2s ease-out",
            pointerEvents: "auto",
            margin: 0,
          }}
        >
          <div className="p-4">
            <div className="text-center mb-4">
              <div
                className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10"
                style={{ width: 80, height: 80 }}
              >
                <i className="fas fa-heart-broken" style={{ color: "#dc3545", fontSize: "2.5rem" }} />
              </div>
              <h4 className="fw-bold mb-2">Unmatch with {profile.name}?</h4>
              <p className="text-secondary small mb-0">
                You will remove this match and won't be able to message each other.
              </p>
            </div>

            <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded-4">
              <img
                src={profile.photo}
                alt={profile.name}
                className="rounded-circle shadow-sm"
                width="60"
                height="60"
                style={{ objectFit: "cover", border: "3px solid #fff" }}
              />
              <div>
                <h5 className="fw-bold mb-1">{profile.name}, {profile.age}</h5>
                <p className="text-secondary small mb-0 text-truncate" style={{ maxWidth: "200px" }}>
                  {profile.bio}
                </p>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                onClick={onClose}
                className="btn flex-grow-1 py-2"
                style={{
                  background: "#f8f9fa",
                  border: "1px solid #e9ecef",
                  borderRadius: "40px",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm(profile);
                  onClose();
                }}
                className="btn flex-grow-1 py-2"
                style={{
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "40px",
                  fontWeight: "500",
                }}
              >
                Yes, Unmatch
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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
        
        .round-action-btn .round-tooltip {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 12px);
          transform: translateX(-50%) translateY(6px);
          background: #1a1a1a;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 20px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 160ms ease, transform 160ms ease;
          box-shadow: 0 10px 22px rgba(0,0,0,0.25);
          z-index: 5;
        }
        
        .round-action-btn .round-tooltip::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #1a1a1a;
        }
        
        .round-action-btn:hover .round-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
    </>
  );
}
