import React from "react";

const AvatarRow = ({ items, onAvatarClick }) => (
  <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
    {items.slice(0, 8).map((person) => (
      <button
        key={person.id}
        type="button"
        className="p-0 border-0 bg-transparent"
        onClick={() => onAvatarClick?.(person)}
        style={{ lineHeight: 0 }}
        aria-label="Open profile"
      >
        <div className="position-relative">
          <img
            src={person.photo}
            alt={person.name || ""}
            className="rounded-circle"
            width="42"
            height="42"
            style={{
              objectFit: "cover",
              border: "2px solid #fff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
          <div
            className="position-absolute bottom-0 end-0 bg-success rounded-circle p-1"
            style={{ width: 8, height: 8 }}
          />
        </div>
      </button>
    ))}

    {items.length > 8 && (
      <span
        className="badge bg-light text-dark rounded-pill px-3 py-2"
        style={{ fontSize: "0.85rem" }}
      >
        +{items.length - 8}
      </span>
    )}
  </div>
);

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
      <span className="fw-semibold" style={{ fontSize: "0.95rem", color: "#2c3e50" }}>
        {title}
      </span>
      <span
        className="badge rounded-pill"
        style={{ background: "#e9ecef", color: "#495057", padding: "6px 12px" }}
      >
        {count}
      </span>
    </div>
    {children}
  </div>
);

export default function MatchesSection({ matchesList, onMatchClick }) {
  return (
    <SectionCard title="Matches" count={matchesList.length}>
      {matchesList.length > 0 ? (
        <AvatarRow items={matchesList} onAvatarClick={onMatchClick} />
      ) : (
        <div className="text-center py-4">
          <div className="text-secondary small">
            <i className="fas fa-heart me-2" style={{ opacity: 0.5, fontSize: "1.2rem" }}></i>
            <div>No matches yet</div>
            <div className="mt-1" style={{ fontSize: "0.8rem", opacity: 0.7 }}>
              Start liking profiles to get matches
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
