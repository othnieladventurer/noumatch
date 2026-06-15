import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getProfilePhotoUrl, formatName } from "../utils/helpers";

export default function LeftBlock({ user, goToMyProfile, conversations = [] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userPhoto = user?.profile_photo_url || user?.profile_photo;
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px 12px',
      display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto',
    }}>
      {/* Mini profile card */}
      <div
        onClick={goToMyProfile}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '4px 8px 20px', borderBottom: '1px solid #E8E5DF',
          marginBottom: 20, cursor: 'pointer',
        }}
      >
        <img
          src={getProfilePhotoUrl(userPhoto) || '/placeholder.png'}
          alt={formatName(user)}
          style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF2D55', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.first_name || formatName(user)}
          </div>
          {user?.location && (
            <div style={{ fontSize: '0.75rem', color: '#8e8e93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <i className="fas fa-map-marker-alt" style={{ marginRight: 3, color: '#FF2D55', fontSize: 9 }}></i>
              {user.location}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); goToMyProfile(); }}
            style={{ marginTop: 4, background: 'none', border: 'none', padding: 0, fontSize: '0.75rem', color: '#FF2D55', cursor: 'pointer', fontWeight: 500 }}
          >
            Voir mon profil
          </button>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem
          icon="fas fa-compass"
          label="Découvrir"
          active={pathname === '/dashboard'}
          onClick={() => navigate('/dashboard')}
        />
        <NavItem
          icon="fas fa-comments"
          label="Conversations"
          active={pathname.startsWith('/messages')}
          badge={unreadCount > 0 ? unreadCount : null}
          onClick={() => navigate('/messages')}
        />
        <NavItem
          icon="fas fa-user"
          label="Moi"
          active={pathname.startsWith('/profile')}
          onClick={goToMyProfile}
        />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', borderRadius: 999,
        border: 'none',
        background: active ? '#FFF0F3' : 'transparent',
        cursor: 'pointer', width: '100%', textAlign: 'left',
        borderLeft: `3px solid ${active ? '#FF2D55' : 'transparent'}`,
        transition: 'background 0.15s',
        position: 'relative',
      }}
    >
      <i className={icon} style={{ color: active ? '#FF2D55' : '#8e8e93', width: 18, fontSize: '0.95rem', flexShrink: 0 }} />
      <span style={{ fontSize: '0.9rem', fontWeight: active ? 600 : 500, color: active ? '#FF2D55' : '#1A1A2E' }}>
        {label}
      </span>
      {badge != null && (
        <span style={{ marginLeft: 'auto', background: '#FF2D55', color: '#fff', borderRadius: 999, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
