import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HEARTS = ['💜', '💜', '💗', '💜', '💗', '💜', '💜', '💗'];
const DISMISS_MS = 6000;

export default function MatchCelebration({ matchedProfile, conversationId, onDismiss }) {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    // Spawn hearts at staggered positions
    const spawned = HEARTS.map((emoji, i) => ({
      id: i,
      emoji,
      left: `${10 + (i * 10) + Math.random() * 8}%`,
      duration: `${3 + Math.random() * 2}s`,
      delay: `${i * 0.25}s`,
    }));
    setHearts(spawned);

    timerRef.current = setTimeout(onDismiss, DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  const handleMessage = () => {
    onDismiss();
    if (conversationId) {
      navigate(`/messages?conversation=${conversationId}`);
    } else if (matchedProfile?.id) {
      navigate(`/messages?match=${matchedProfile.id}`);
    } else {
      navigate('/messages');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(26,26,46,0.96)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Rising hearts */}
      {hearts.map((h) => (
        <span
          key={h.id}
          className="nm-heart"
          style={{ left: h.left, animationDuration: h.duration, animationDelay: h.delay }}
        >
          {h.emoji}
        </span>
      ))}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 32px', maxWidth: 380 }}>
        {matchedProfile?.profile_photo_url || matchedProfile?.profile_photo ? (
          <img
            src={matchedProfile.profile_photo_url || matchedProfile.profile_photo}
            alt={matchedProfile.first_name}
            style={{
              width: 100, height: 100, borderRadius: '50%',
              objectFit: 'cover', objectPosition: 'center top',
              border: '3px solid #8B30C9', marginBottom: 24,
            }}
          />
        ) : (
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: '#1A1A2E', border: '3px solid #8B30C9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, color: '#FF2D55', fontWeight: 700,
            marginBottom: 24, margin: '0 auto 24px',
          }}>
            {(matchedProfile?.first_name || '?')[0].toUpperCase()}
          </div>
        )}

        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 28, marginBottom: 12 }}>
          C'est un match ! 💜
        </h2>
        <p style={{ color: '#ccc', fontSize: 16, marginBottom: 40, lineHeight: 1.5 }}>
          Toi et {matchedProfile?.first_name || 'quelqu\'un'} vous vous êtes aimé(e)s
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleMessage}
            style={{
              background: '#FF2D55', color: '#fff',
              border: 'none', borderRadius: 999,
              padding: '14px 32px', fontSize: 16, fontWeight: 600,
              cursor: 'pointer', width: '100%',
            }}
          >
            Envoyer un message
          </button>
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent', color: '#fff',
              border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 999,
              padding: '14px 32px', fontSize: 16, fontWeight: 500,
              cursor: 'pointer', width: '100%',
            }}
          >
            Continuer à découvrir
          </button>
        </div>
      </div>
    </div>
  );
}
