import React, { useState } from 'react';

const ReportModal = ({ isOpen, onClose, reportedUser }) => {
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const REPORT_REASONS = [
    { value: 'fake_profile', label: 'Fake Profile' },
    { value: 'harassment', label: 'Harassment or Bullying' },
    { value: 'inappropriate_content', label: 'Inappropriate Photos/Content' },
    { value: 'scam', label: 'Scam or Fraud' },
    { value: 'underage', label: 'User May Be Underage' },
    { value: 'offensive_language', label: 'Offensive Language' },
    { value: 'spam', label: 'Spam' },
    { value: 'privacy_violation', label: 'Privacy Violation' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmitReport = async () => {
    if (!reportReason) {
      setReportError('Please select a reason');
      return;
    }

    setSubmitting(true);
    setReportError('');

    try {
      const token = localStorage.getItem('access');
      const formData = new FormData();
      formData.append('reported_user', reportedUser.id);
      formData.append('reason', reportReason);
      formData.append('description', reportDescription);

      const response = await fetch('http://127.0.0.1:8000/api/reports/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
        setReportError(data.error || 'Failed to submit report');
      }
    } catch (error) {
      setReportError('Network error. Please try again.');
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
          <h4 className="fw-bold mb-0">Report User</h4>
          <button
            onClick={onClose}
            className="btn-close"
            style={{ fontSize: '1rem' }}
          ></button>
        </div>

        {reportSuccess ? (
          <div className="text-center py-4">
            <div className="text-success mb-3">
              <i className="fas fa-check-circle" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5>Report Submitted!</h5>
            <p className="text-secondary">Thank you for helping keep our community safe.</p>
          </div>
        ) : (
          <>
            {reportError && (
              <div className="alert alert-danger">{reportError}</div>
            )}

            <div className="mb-3">
              <label className="form-label fw-semibold">Reason for Report *</label>
              <select
                className="form-select"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{ borderRadius: '12px' }}
              >
                <option value="">Select a reason</option>
                {REPORT_REASONS.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Additional Details</label>
              <textarea
                className="form-control"
                rows="4"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Please provide any additional information..."
                style={{ borderRadius: '12px' }}
              />
            </div>

            <div className="d-flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="btn btn-outline-secondary w-50"
                style={{ borderRadius: '30px' }}
              >
                Cancel
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
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
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
