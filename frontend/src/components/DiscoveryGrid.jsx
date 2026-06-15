import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const EMPTY_STATE_TS_KEY = 'nm_empty_state_ts';
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;

export default function DiscoveryGrid({
  profiles,
  profilesLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onRefresh,
  user,
  windowWidth,
}) {
  const navigate = useNavigate();
  const cols = windowWidth >= 768 ? 3 : 2;

  const [showRefresh, setShowRefresh] = useState(() => {
    const ts = localStorage.getItem(EMPTY_STATE_TS_KEY);
    return ts ? Date.now() - parseInt(ts, 10) >= REFRESH_COOLDOWN_MS : false;
  });

  useEffect(() => {
    if (!profilesLoading && profiles.length === 0) {
      const ts = localStorage.getItem(EMPTY_STATE_TS_KEY);
      if (!ts) {
        localStorage.setItem(EMPTY_STATE_TS_KEY, String(Date.now()));
        setShowRefresh(false);
      } else {
        setShowRefresh(Date.now() - parseInt(ts, 10) >= REFRESH_COOLDOWN_MS);
      }
    } else if (profiles.length > 0) {
      localStorage.removeItem(EMPTY_STATE_TS_KEY);
      setShowRefresh(false);
    }
  }, [profilesLoading, profiles.length]);

  const inviteLink = user?.referral_code
    ? `${window.location.origin}/register?ref=${user.referral_code}`
    : null;

  const handleCopyInvite = () => {
    if (!inviteLink) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        alert('Lien d\'invitation copié !');
      }).catch(() => {
        alert(inviteLink);
      });
    } else {
      alert(inviteLink);
    }
  };

  if (profilesLoading && !profiles.length) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', background: '#f5f7fb' }}>
        <div className="spinner-border text-danger" role="status" />
      </div>
    );
  }

  if (!profilesLoading && !profiles.length) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px', textAlign: 'center', background: '#000', minHeight: '100%', color: '#fff',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>💜</div>
        <h4 style={{ fontWeight: 700, marginBottom: '12px', lineHeight: 1.3 }}>
          Tu as découvert tout le monde pour l'instant
        </h4>
        <p style={{ fontSize: '0.9rem', opacity: 0.75, maxWidth: '300px', lineHeight: 1.65, marginBottom: '6px' }}>
          NouMatch grandit chaque jour en Haïti. De nouveaux profils arrivent régulièrement.
        </p>
        <p style={{ fontSize: '0.9rem', opacity: 0.75, maxWidth: '300px', lineHeight: 1.65, marginBottom: '28px' }}>
          En attendant, invite tes amis pour agrandir la communauté !
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px' }}>
          {inviteLink && (
            <button
              onClick={handleCopyInvite}
              className="btn btn-danger rounded-pill py-2"
              style={{ background: 'linear-gradient(135deg, #ff4d6d, #ff3355)', border: 'none', fontWeight: 600 }}
            >
              <i className="fas fa-share-alt me-2"></i>Inviter des amis
            </button>
          )}
          {showRefresh && (
            <button onClick={onRefresh} className="btn btn-outline-light rounded-pill py-2">
              <i className="fas fa-sync-alt me-2"></i>Rafraîchir
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px', background: '#f5f7fb' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '12px',
      }}>
        {profiles.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onClick={() => navigate(`/profile/${profile.id}`)}
          />
        ))}
      </div>

      {isLoadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <div className="spinner-border spinner-border-sm text-danger" role="status" />
        </div>
      )}

      {!isLoadingMore && hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <button
            onClick={onLoadMore}
            className="btn btn-outline-danger rounded-pill px-5 py-2"
            style={{ fontWeight: 600 }}
          >
            Voir plus
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ profile, onClick }) {
  const age = profile.age;
  const city = profile.location || profile.city || '';
  const photo = profile.profile_photo;
  const initial = (profile.first_name || '?')[0].toUpperCase();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: '3 / 4',
        background: '#1A1A2E',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        userSelect: 'none',
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt={profile.first_name || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          loading="lazy"
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#1A1A2E',
          fontSize: 'clamp(2rem, 10vw, 4rem)',
          fontWeight: 700,
          color: '#FF2D55',
          letterSpacing: '-0.02em',
        }}>
          {initial}
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {profile.is_verified && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          borderRadius: '20px', padding: '3px 8px',
          fontSize: '10px', color: '#4ade80', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '3px',
        }}>
          <i className="fas fa-check-circle" style={{ fontSize: '9px' }} />
          Vérifié
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '10px 12px', color: '#fff', pointerEvents: 'none',
      }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2 }}>
          {profile.first_name}{age ? `, ${age}` : ''}
        </div>
        {city && (
          <div style={{ fontSize: '0.72rem', opacity: 0.82, marginTop: '2px' }}>
            <i className="fas fa-map-marker-alt" style={{ fontSize: '0.65rem', marginRight: '3px' }} />
            {city}
          </div>
        )}
      </div>
    </div>
  );
}
