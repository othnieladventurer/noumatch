// Helper function to format name
export const formatName = (profile) => {
  if (!profile) return "";
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  if (profile.first_name) return profile.first_name;
  if (profile.last_name) return profile.last_name;
  return "";
};

// Calculate age
export const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Shuffle array
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Photo URL helper - handles Cloudflare R2 URLs and local development
export const getProfilePhotoUrl = (path) => {
  if (!path) return null;
  
  // If it's already a full URL (from Cloudflare R2 or other CDN), return it directly
  if (path.startsWith('http')) return path;

  // For local development or relative paths (fallback)
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  const normalizedPath = path.startsWith('/media') ? path : `/media/${path}`;
  
  return `${baseUrl}${normalizedPath}`;
};