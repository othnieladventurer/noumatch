export default function AdminPageSpinner({ label = 'Loading...' }) {
  return (
    <div
      className="d-flex align-items-center gap-2 text-secondary small"
      role="status"
      aria-live="polite"
    >
      <span className="spinner-border spinner-border-sm text-danger" aria-hidden="true"></span>
      <span>{label}</span>
    </div>
  );
}
