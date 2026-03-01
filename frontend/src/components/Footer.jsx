export default function Footer() {
  return (
    <footer className="bg-dark text-light py-4">
      <div className="container text-center">
        <p className="mb-1">
          © 2026 NouMatch — Des connexions sincères et respectueuses
        </p>
        <a href="/privacy" className="text-light me-3">
          Politique de confidentialité
        </a>
        <a href="/terms" className="text-light">
          Conditions d’utilisation
        </a>
      </div>
    </footer>
  );
}