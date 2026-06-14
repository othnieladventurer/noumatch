import React, { useState } from 'react';
import { getRuntimeApiBase } from '../utils/apiBase';

const REPORT_REASONS = [
  { value: 'fake_profile',           label: 'Faux profil' },
  { value: 'harassment',             label: 'Harcèlement ou intimidation' },
  { value: 'inappropriate_content',  label: 'Photos ou contenu inapproprié' },
  { value: 'scam',                   label: 'Arnaque ou fraude' },
  { value: 'underage',               label: 'Utilisateur potentiellement mineur' },
  { value: 'offensive_language',     label: 'Langage offensant' },
  { value: 'spam',                   label: 'Spam' },
  { value: 'privacy_violation',      label: 'Violation de la vie privée' },
  { value: 'other',                  label: 'Autre' },
];

const ReportModal = ({ isOpen, onClose, reportedUser }) => {
  const API_BASE = getRuntimeApiBase();
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleSubmitReport = async () => {
    if (!reportReason) {
      setReportError('Veuillez sélectionner une raison');
      return;
    }

    setSubmitting(true);
    setReportError('');

    try {
      const formData = new FormData();
      formData.append('reported_user', reportedUser.id);
      formData.append('reason', reportReason);
      formData.append('description', reportDescription);

      const response = await fetch(`${API_BASE}/api/reports/create/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportSuccess(false);
          setReportReason('');
          setReportDescription('');
          onClose();
        }, 2000);
      } else {
        const data = await response.json();
        setReportError(data.error || 'Échec de l\'envoi du signalement');
      }
    } catch {
      setReportError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '500px',
          borderRadius: '24px',
          position: 'relative',
          zIndex: 1000001,
          background: 'white',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold mb-0">Signaler un utilisateur</h4>
          <button onClick={onClose} className="btn-close" style={{ fontSize: '1rem' }} />
        </div>

        {reportSuccess ? (
          <div className="text-center py-4">
            <div className="text-success mb-3">
              <i className="fas fa-check-circle" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5>Signalement envoyé !</h5>
            <p className="text-secondary">Merci de nous aider à garder notre communauté sûre.</p>
          </div>
        ) : (
          <>
            {reportError && (
              <div className="alert alert-danger">{reportError}</div>
            )}

            <div className="mb-3">
              <label className="form-label fw-semibold">Raison du signalement *</label>
              <select
                className="form-select"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{ borderRadius: '12px' }}
              >
                <option value="">Sélectionnez une raison</option>
                {REPORT_REASONS.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Détails supplémentaires</label>
              <textarea
                className="form-control"
                rows="4"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Fournissez toute information complémentaire..."
                style={{ borderRadius: '12px' }}
              />
            </div>

            <div className="d-flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="btn btn-outline-secondary w-50"
                style={{ borderRadius: '30px' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitReport}
                className="btn btn-danger w-50"
                disabled={submitting}
                style={{ borderRadius: '30px' }}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer le signalement'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
