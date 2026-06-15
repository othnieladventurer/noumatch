import React, { useState } from "react";
import { formatName, calculateAge, getProfilePhotoUrl } from "../utils/helpers";

const sectionLabel = {
  fontSize: 11, fontWeight: 700, color: '#FF2D55',
  textTransform: 'uppercase', letterSpacing: '1.5px',
  marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
};

function pillBtn(bg, color, extra = {}) {
  return {
    padding: '10px 16px', borderRadius: 999, border: 'none',
    background: bg, color, fontWeight: 600, fontSize: '0.88rem',
    cursor: 'pointer', width: '100%', ...extra,
  };
}

function InfoRow({ icon, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
      <i className={icon} style={{ color: '#FF2D55', width: 16, fontSize: '0.82rem', flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: '0.82rem', color: '#4a4a4a', lineHeight: 1.4 }}>{value}</span>
    </div>
  );
}

export default function RightBlock({
  currentProfile, isMatched, isLiked, goToProfile, goToMessenger,
  handleUnmatch, handlePass, handleLike, handleCoeur, coeurLimits,
  openReportModal, handleBlock,
}) {
  const [dotsOpen, setDotsOpen] = useState(false);

  if (!currentProfile) {
    return (
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #E8E5DF',
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.25 }}>👤</div>
        <p style={{ color: '#999', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
          Sélectionne un profil pour le découvrir
        </p>
      </div>
    );
  }

  const age = currentProfile.age || (currentProfile.birth_date ? calculateAge(currentProfile.birth_date) : null);
  const photo = currentProfile.profile_photo_url || currentProfile.profile_photo;
  const matched = isMatched(currentProfile.id);
  const liked = isLiked(currentProfile.id);

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E8E5DF',
      height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '24px 16px 16px', borderBottom: '1px solid #E8E5DF' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
          <img
            src={photo ? photo : getProfilePhotoUrl(null)}
            alt={formatName(currentProfile)}
            onClick={() => goToProfile(currentProfile.id)}
            style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #FF2D55', cursor: 'pointer', display: 'block' }}
          />
          {matched && (
            <span style={{
              position: 'absolute', bottom: 0, right: -4,
              background: '#FF2D55', borderRadius: '50%', width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
            }}>
              <i className="fas fa-heart" style={{ fontSize: 8, color: '#fff' }} />
            </span>
          )}
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A1A2E' }}>
          {formatName(currentProfile)}{age ? `, ${age}` : ''}
        </div>
        {currentProfile.location && (
          <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: 3 }}>
            <i className="fas fa-map-marker-alt" style={{ color: '#FF2D55', marginRight: 3, fontSize: 9 }} />
            {currentProfile.location}
          </div>
        )}
      </div>

      {/* Sections */}
      <div style={{ padding: '16px', flex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={sectionLabel}><i className="fas fa-info-circle" /> INFOS DE BASE</div>
          <InfoRow icon="fas fa-venus-mars" value={currentProfile.gender ? currentProfile.gender.charAt(0).toUpperCase() + currentProfile.gender.slice(1) : 'Non spécifié'} />
          <InfoRow icon="fas fa-cake-candles" value={age ? `${age} ans` : 'Âge non spécifié'} />
          <InfoRow icon="fas fa-ruler" value={currentProfile.height ? `${currentProfile.height} cm` : 'Non spécifié'} />
        </div>

        {(currentProfile.career || currentProfile.education) && (
          <div style={{ marginBottom: 16 }}>
            <div style={sectionLabel}><i className="fas fa-briefcase" /> PROFESSION</div>
            {currentProfile.career && <InfoRow icon="fas fa-briefcase" value={currentProfile.career} />}
            {currentProfile.education && <InfoRow icon="fas fa-graduation-cap" value={currentProfile.education} />}
          </div>
        )}

        {(currentProfile.passions || currentProfile.hobbies) && (
          <div style={{ marginBottom: 16 }}>
            <div style={sectionLabel}><i className="fas fa-heart" /> PASSIONS & LOISIRS</div>
            {currentProfile.passions && <InfoRow icon="fas fa-fire" value={currentProfile.passions} />}
            {currentProfile.hobbies && <InfoRow icon="fas fa-pencil" value={currentProfile.hobbies} />}
          </div>
        )}

        {currentProfile.favorite_music && (
          <div style={{ marginBottom: 16 }}>
            <div style={sectionLabel}><i className="fas fa-music" /> MUSIQUE</div>
            <InfoRow icon="fas fa-headphones" value={currentProfile.favorite_music} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #E8E5DF' }}>
        {matched ? (
          <>
            <button onClick={() => goToMessenger(currentProfile.id)} style={pillBtn('#FF2D55', '#fff', { marginBottom: 8 })}>
              💬 Envoyer un message
            </button>
            <button onClick={() => handleUnmatch?.(currentProfile)} style={{ ...pillBtn('transparent', '#8e8e93'), border: '1.5px solid #E8E5DF' }}>
              <i className="fas fa-heart-broken" style={{ marginRight: 6 }} /> Unmatch
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button onClick={handlePass} style={{ ...pillBtn('transparent', '#FF2D55', { flex: 1 }), border: '1.5px solid #FF2D55' }}>
                Passer
              </button>
              <button onClick={handleLike} style={pillBtn('#FF2D55', '#fff', { flex: 1 })}>
                {liked ? '❤️ Aimé' : "J'aime ❤️"}
              </button>
            </div>
            {handleCoeur && (
              <button
                onClick={handleCoeur}
                disabled={!coeurLimits?.can_use}
                style={{
                  ...pillBtn(coeurLimits?.can_use ? '#8B30C9' : '#d1d5db', '#fff', { marginBottom: 8 }),
                  opacity: coeurLimits?.can_use ? 1 : 0.55,
                  cursor: coeurLimits?.can_use ? 'pointer' : 'not-allowed',
                }}
              >
                💜 Coup de Coeur {coeurLimits?.can_use ? `(${coeurLimits.remaining})` : '(0)'}
              </button>
            )}
          </>
        )}

        {/* ··· dots menu */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={() => setDotsOpen(o => !o)}
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px', fontWeight: 700, letterSpacing: 1 }}
            aria-label="Plus d'options"
          >
            •••
          </button>
          {dotsOpen && (
            <>
              <div onClick={() => setDotsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
              <div style={{
                position: 'absolute', bottom: '100%', right: 0,
                background: '#fff', border: '1px solid #E8E5DF', borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 210, zIndex: 100, overflow: 'hidden',
              }}>
                <button
                  onClick={() => { setDotsOpen(false); openReportModal?.(currentProfile); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.88rem', color: '#1A1A2E' }}
                >
                  🚩 Signaler ce profil
                </button>
                <button
                  onClick={() => { setDotsOpen(false); handleBlock?.(currentProfile); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.88rem', color: '#FF2D55', borderTop: '1px solid #F0EEE8' }}
                >
                  🚫 Bloquer cet utilisateur
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
