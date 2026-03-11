import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Photo gallery state
  const [userPhotos, setUserPhotos] = useState([]);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalPhotos, setModalPhotos] = useState([]);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    bio: "",
    birth_date: "",
    gender: "",
    interested_in: "",
    location: "",
    height: "",
    passions: "",
    career: "",
    education: "",
    hobbies: "",
    favorite_music: "",
    profile_photo: null,
  });

  const [photoPreview, setPhotoPreview] = useState(null);

  const API_BASE_URL = "http://127.0.0.1:8000/api";

  const getProfilePhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/media")) return `http://127.0.0.1:8000${path}`;
    return `http://127.0.0.1:8000${path}`;
  };

  const getAllPhotos = () => {
    const photos = [];

    if (photoPreview) {
      photos.push({ id: "main", image: photoPreview, is_main: true });
    }

    userPhotos.forEach((photo) => {
      if (photo.image !== photoPreview) {
        photos.push(photo);
      }
    });

    return photos;
  };

  const getCurrentPhoto = () => {
    const photos = getAllPhotos();
    if (photos.length === 0) return photoPreview || "https://via.placeholder.com/800";
    return photos[activePhotoIndex]?.image || photos[0]?.image;
  };

  const nextPhoto = (e) => {
    e?.stopPropagation();
    const photos = getAllPhotos();
    if (photos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e) => {
    e?.stopPropagation();
    const photos = getAllPhotos();
    if (photos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const openPhotoModal = (photoUrl, index = 0) => {
    const photos = getAllPhotos().map((p) => p.image);
    setModalPhotos(photos);
    setModalPhotoIndex(index);
    setSelectedPhoto(photoUrl);
    setPhotoModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
    setModalPhotos([]);
    document.body.style.overflow = "unset";
  };

  const openDeleteModal = (photo) => {
    setPhotoToDelete(photo);
    setDeleteModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setPhotoToDelete(null);
    document.body.style.overflow = "unset";
  };

  const fetchUserPhotos = async (userId) => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`${API_BASE_URL}/users/${userId}/photos/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const photos = data.map((photo) => ({
          id: photo.id,
          image: getProfilePhotoUrl(photo.image),
          uploaded_at: photo.uploaded_at,
        }));
        setUserPhotos(photos);
        return photos;
      }
    } catch (error) {
      console.error("Error fetching user photos:", error);
    }
    return [];
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    setError(null);

    try {
      const token = localStorage.getItem("access");
      const uploadData = new FormData();

      files.forEach((file) => uploadData.append("images", file));

      const response = await fetch(`${API_BASE_URL}/users/photos/upload-multiple/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: uploadData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload photos");
      }

      if (user) {
        await fetchUserPhotos(user.id);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error.message || "Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
      e.target.value = null;
    }
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    setDeletingPhoto(photoToDelete.id);

    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`${API_BASE_URL}/users/photos/${photoToDelete.id}/delete/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete photo");
      }

      const deletedImage = photoToDelete.image;
      const remainingPhotos = userPhotos.filter((p) => p.id !== photoToDelete.id);
      setUserPhotos(remainingPhotos);

      if (photoPreview === deletedImage) {
        const nextMainPhoto = remainingPhotos[0]?.image || null;
        setPhotoPreview(nextMainPhoto);
        setUser((prev) => ({
          ...prev,
          profile_photo: nextMainPhoto,
        }));
      }

      setActivePhotoIndex(0);
      closeDeleteModal();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error.message || "Failed to delete photo");
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handleSetMainPhoto = async (photoUrl, photoId) => {
    try {
      const token = localStorage.getItem("access");
      const photo = userPhotos.find((p) => p.id === photoId);

      if (!photo) return;

      const submitData = new FormData();
      const filename = photo.image.split("/").pop();
      submitData.append("profile_photo", filename);

      const response = await fetch(`${API_BASE_URL}/users/profile/update/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: submitData,
      });

      if (!response.ok) throw new Error("Failed to set main photo");

      const updatedUser = await response.json();
      setUser((prev) => ({ ...prev, ...updatedUser }));
      setPhotoPreview(photoUrl);
      setActivePhotoIndex(0);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error.message || "Failed to set main photo");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const meResponse = await fetch(`${API_BASE_URL}/users/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (meResponse.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
          return;
        }

        const meData = await meResponse.json();

        const profileResponse = await fetch(`${API_BASE_URL}/users/profiles/${meData.id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profileData = profileResponse.ok ? await profileResponse.json() : {};
        const fullUserData = { ...meData, ...profileData };

        setUser(fullUserData);
        await fetchUserPhotos(meData.id);

        setFormData({
          first_name: fullUserData.first_name || "",
          last_name: fullUserData.last_name || "",
          bio: fullUserData.bio || "",
          birth_date: fullUserData.birth_date ? fullUserData.birth_date.split("T")[0] : "",
          gender: fullUserData.gender || "",
          interested_in: fullUserData.interested_in || "",
          location: fullUserData.location || "",
          height: fullUserData.height || "",
          passions: fullUserData.passions || "",
          career: fullUserData.career || "",
          education: fullUserData.education || "",
          hobbies: fullUserData.hobbies || "",
          favorite_music: fullUserData.favorite_music || "",
          profile_photo: null,
        });

        if (fullUserData.profile_photo) {
          setPhotoPreview(getProfilePhotoUrl(fullUserData.profile_photo));
        }
      } catch (error) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatName = (profile) => {
    if (!profile) return "";
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.first_name || profile.last_name || "";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMainPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profile_photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
      setActivePhotoIndex(0);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("access");
      const formDataToSend = new FormData();

      Object.keys(formData).forEach((key) => {
        if (key === "profile_photo" && formData[key] instanceof File) {
          formDataToSend.append("profile_photo", formData[key]);
        } else if (formData[key] !== null && formData[key] !== "") {
          formDataToSend.append(key, formData[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/users/profile/update/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const updatedUser = await response.json();
      setUser((prev) => ({ ...prev, ...updatedUser }));

      if (updatedUser.profile_photo) {
        setPhotoPreview(getProfilePhotoUrl(updatedUser.profile_photo));
      }

      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);

    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        bio: user.bio || "",
        birth_date: user.birth_date ? user.birth_date.split("T")[0] : "",
        gender: user.gender || "",
        interested_in: user.interested_in || "",
        location: user.location || "",
        height: user.height || "",
        passions: user.passions || "",
        career: user.career || "",
        education: user.education || "",
        hobbies: user.hobbies || "",
        favorite_music: user.favorite_music || "",
        profile_photo: null,
      });

      setPhotoPreview(getProfilePhotoUrl(user.profile_photo));
      setActivePhotoIndex(0);
    }
  };

  const goBack = () => navigate(-1);

  const PhotoModal = () => {
    if (!photoModalOpen) return null;

    const goToNextModalPhoto = (e) => {
      e.stopPropagation();
      if (modalPhotos.length <= 1) return;
      const nextIndex = (modalPhotoIndex + 1) % modalPhotos.length;
      setModalPhotoIndex(nextIndex);
      setSelectedPhoto(modalPhotos[nextIndex]);
    };

    const goToPrevModalPhoto = (e) => {
      e.stopPropagation();
      if (modalPhotos.length <= 1) return;
      const prevIndex = (modalPhotoIndex - 1 + modalPhotos.length) % modalPhotos.length;
      setModalPhotoIndex(prevIndex);
      setSelectedPhoto(modalPhotos[prevIndex]);
    };

    return (
      <>
        <div
          onClick={closePhotoModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 999999,
            backdropFilter: "blur(8px)",
            cursor: "pointer",
          }}
        />
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            pointerEvents: "none",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "95vw",
              maxHeight: "95vh",
              position: "relative",
              pointerEvents: "auto",
            }}
          >
            <button
              onClick={closePhotoModal}
              style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                background: "white",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                fontSize: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                zIndex: 1000002,
              }}
            >
              <i className="fas fa-times"></i>
            </button>

            {modalPhotos.length > 1 && (
              <>
                <button
                  onClick={goToPrevModalPhoto}
                  style={{
                    position: "absolute",
                    left: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "#ff4d6d",
                    border: "none",
                    borderRadius: "50%",
                    width: "50px",
                    height: "50px",
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                    zIndex: 1000002,
                    color: "white",
                  }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button
                  onClick={goToNextModalPhoto}
                  style={{
                    position: "absolute",
                    right: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "#ff4d6d",
                    border: "none",
                    borderRadius: "50%",
                    width: "50px",
                    height: "50px",
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                    zIndex: 1000002,
                    color: "white",
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </>
            )}

            <div
              style={{
                position: "absolute",
                bottom: "-40px",
                left: "50%",
                transform: "translateX(-50%)",
                color: "white",
                fontSize: "16px",
                background: "rgba(0,0,0,0.5)",
                padding: "6px 16px",
                borderRadius: "20px",
              }}
            >
              {modalPhotoIndex + 1} / {modalPhotos.length}
            </div>

            <img
              src={selectedPhoto}
              alt="Full size"
              style={{
                maxWidth: "100%",
                maxHeight: "95vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
              }}
            />
          </div>
        </div>
      </>
    );
  };

  const DeletePhotoModal = () => {
    if (!deleteModalOpen || !photoToDelete) return null;

    return (
      <>
        <div
          onClick={closeDeleteModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 999998,
            backdropFilter: "blur(4px)",
          }}
        />
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#fff",
              borderRadius: "22px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div className="text-center mb-3">
              <div
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  background: "#fff0f3",
                  margin: "0 auto 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ff4d6d",
                  fontSize: "28px",
                }}
              >
                <i className="fas fa-trash"></i>
              </div>
              <h4 style={{ fontWeight: 700, marginBottom: "8px" }}>Delete this photo?</h4>
              <p style={{ color: "#6c757d", marginBottom: 0 }}>
                This will remove the photo from your profile gallery.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "22px" }}>
              <button
                onClick={closeDeleteModal}
                disabled={!!deletingPhoto}
                style={{
                  flex: 1,
                  height: "48px",
                  borderRadius: "14px",
                  border: "1px solid #dee2e6",
                  background: "#fff",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePhoto}
                disabled={!!deletingPhoto}
                style={{
                  flex: 1,
                  height: "48px",
                  borderRadius: "14px",
                  border: "none",
                  background: "#ff4d6d",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {deletingPhoto ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <>
        <DashboardNavbar user={user} />
        <div className="container py-5 text-center">
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-secondary">Loading your profile...</p>
        </div>
      </>
    );
  }

  const photos = getAllPhotos();
  const currentPhoto = getCurrentPhoto();

  return (
    <>
      <DashboardNavbar user={user} />
      <PhotoModal />
      <DeletePhotoModal />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
        }

        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          background: #f5f7fb;
        }

        .profile-page {
          font-family: 'Inter', sans-serif;
          background: #f5f7fb;
          min-height: 100vh;
          margin: 0 !important;
          padding: 0 !important;
          position: relative;
        }

        .profile-page > *:first-child {
          margin-top: 0 !important;
        }

        .photo-gallery {
          position: relative;
          width: 100%;
          height: 60vh;
          background: #111;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 !important;
          padding: 0 !important;
        }

        .main-photo {
          width: auto;
          height: 100%;
          max-width: 100%;
          object-fit: contain;
          object-position: center;
          background-color: #111;
          transition: opacity 0.3s ease;
          cursor: pointer;
        }

        .gallery-back-btn,
        .gallery-edit-btn,
        .gallery-save-btn {
          position: absolute;
          top: 20px;
          z-index: 50;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
          border: none;
          color: #ff4d6d;
          min-width: 44px;
          height: 44px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          padding: 0 16px;
          gap: 8px;
          font-weight: 700;
        }

        .gallery-back-btn {
          left: 20px;
          width: 44px;
          padding: 0;
        }

        .gallery-edit-btn {
          right: 20px;
          width: 44px;
          padding: 0;
        }

        .gallery-save-btn {
          right: 20px;
          background: #ff4d6d;
          color: #fff;
        }

        .gallery-back-btn:hover,
        .gallery-edit-btn:hover,
        .gallery-save-btn:hover {
          transform: scale(1.05);
        }

        .photo-count {
          position: absolute;
          top: 20px;
          right: 80px;
          z-index: 50;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          color: white;
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 0.9rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .photo-count i {
          color: #ff4d6d;
        }

        .gallery-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 40px 24px 24px;
          background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
          color: white;
          z-index: 30;
        }

        .gallery-name {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 4px;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .gallery-age {
          font-size: 1.8rem;
          font-weight: 400;
          margin-left: 10px;
          opacity: 0.9;
        }

        .gallery-location {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 1rem;
          opacity: 0.9;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .top-edit-photo-box {
          margin-top: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.12);
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(10px);
        }

        .top-edit-photo-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .mini-upload-btn {
          border: none;
          background: #ff4d6d;
          color: #fff;
          padding: 10px 16px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .mini-upload-btn:hover {
          background: #ff3355;
        }

        .photo-nav {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          z-index: 40;
          display: flex;
          align-items: center;
        }

        .photo-nav-left {
          left: 0;
          justify-content: flex-start;
          padding-left: 20px;
        }

        .photo-nav-right {
          right: 0;
          justify-content: flex-end;
          padding-right: 20px;
        }

        .photo-nav button {
          background: #ff4d6d;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          color: white;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          cursor: pointer;
          opacity: 0.95;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        .photo-nav button:hover {
          background: #ff3355;
          transform: scale(1.1);
        }

        .photo-indicators {
          position: absolute;
          bottom: 100px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 8px;
          z-index: 35;
          padding: 0 20px;
        }

        .photo-indicator {
          width: 40px;
          height: 4px;
          background: rgba(255,255,255,0.4);
          border-radius: 2px;
          transition: all 0.3s;
          cursor: pointer;
        }

        .photo-indicator.active {
          background: #ff4d6d;
          width: 60px;
        }

        .thumbnail-strip {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 36;
          padding: 8px 12px;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
          border-radius: 30px;
        }

        .thumbnail {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.3s;
          opacity: 0.7;
        }

        .thumbnail:hover {
          opacity: 1;
          transform: scale(1.05);
        }

        .thumbnail.active {
          border-color: #ff4d6d;
          opacity: 1;
        }

        .profile-content {
          max-width: 800px;
          margin: -30px auto 0;
          background: white;
          border-radius: 30px 30px 0 0;
          position: relative;
          z-index: 40;
          box-shadow: 0 -10px 30px rgba(0,0,0,0.05);
        }

        .profile-section {
          padding: 24px;
          border-bottom: 1px solid #f0f0f0;
        }

        .profile-section:last-child {
          border-bottom: none;
        }

        .section-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #2d2d2d;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
        }

        .section-title i {
          color: #ff4d6d;
          margin-right: 10px;
          font-size: 1.2rem;
        }

        .about-text {
          font-size: 1rem;
          line-height: 1.6;
          color: #4a4a4a;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 16px;
          position: relative;
        }

        .about-text i {
          color: #ff4d6d;
          opacity: 0.5;
          font-size: 1rem;
        }

        .info-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }

        .info-chip {
          background: #f8f9fa;
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 0.9rem;
          color: #2d2d2d;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #e9ecef;
        }

        .info-chip i {
          color: #ff4d6d;
          width: 16px;
        }

        .professional-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .professional-card {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #e9ecef;
        }

        .professional-label {
          font-size: 0.75rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .professional-value {
          font-size: 1rem;
          font-weight: 500;
          color: #2d2d2d;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .professional-value i {
          color: #ff4d6d;
          width: 18px;
        }

        .interest-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .interest-tag {
          background: #f8f9fa;
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 0.9rem;
          color: #2d2d2d;
          border: 1px solid #e9ecef;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .interest-tag i {
          color: #ff4d6d;
        }

        .verification-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 30px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .verified-badge {
          background: #d4edda;
          color: #155724;
        }

        .unverified-badge {
          background: #f8d7da;
          color: #721c24;
        }

        .edit-form-control {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          font-size: 0.95rem;
          transition: all 0.2s;
          background: #ffffff;
        }

        .edit-form-control:focus {
          outline: none;
          border-color: #ff4d6d;
          box-shadow: 0 0 0 3px rgba(255,77,109,0.1);
        }

        .edit-form-label {
          font-size: 0.8rem;
          color: #6c757d;
          font-weight: 500;
          margin-bottom: 4px;
          display: block;
        }

        .photo-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .gallery-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          background: #f8f9fa;
        }

        .gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
        }

        .gallery-item-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.15));
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 10px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .gallery-item:hover .gallery-item-overlay {
          opacity: 1;
        }

        .gallery-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .gallery-item-btn {
          min-width: 34px;
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          background: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2d2d2d;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 700;
          transition: all 0.2s;
          gap: 6px;
        }

        .gallery-item-btn:hover {
          transform: scale(1.04);
        }

        .gallery-item-btn.delete-btn {
          color: #dc3545;
        }

        .gallery-item-btn.main-btn {
          color: #ff4d6d;
        }

        .main-photo-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: #ff4d6d;
          color: white;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 0.65rem;
          font-weight: 600;
          z-index: 2;
        }

        .upload-placeholder {
          aspect-ratio: 1;
          border: 2px dashed #dee2e6;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.2s;
          background: #f8f9fa;
          text-align: center;
          padding: 10px;
        }

        .upload-placeholder:hover {
          border-color: #ff4d6d;
          color: #ff4d6d;
          background: #fff0f3;
        }

        .upload-placeholder i {
          font-size: 1.5rem;
        }

        .upload-placeholder span {
          font-size: 0.75rem;
        }

        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 12px;
          padding: 24px;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 12px 28px;
          border-radius: 40px;
          font-weight: 600;
          font-size: 0.95rem;
          border: none;
          transition: all 0.3s;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          min-width: 130px;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #ff4d6d, #ff3355);
          color: white;
        }

        .action-btn.secondary {
          background: white;
          color: #2d2d2d;
          border: 1px solid #2d2d2d;
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert-overlay {
          position: absolute;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          width: auto;
          min-width: 300px;
          max-width: 90%;
          pointer-events: all;
        }

        @media (max-width: 768px) {
          .photo-gallery {
            height: 50vh;
          }

          .main-photo {
            width: 100%;
            height: auto;
            max-height: 100%;
          }

          .gallery-name {
            font-size: 2rem;
          }

          .gallery-age {
            font-size: 1.4rem;
          }

          .profile-content {
            margin-top: -20px;
          }

          .photo-indicators {
            bottom: 80px;
          }

          .photo-indicator {
            width: 30px;
          }

          .photo-indicator.active {
            width: 45px;
          }

          .photo-count {
            right: 72px;
            padding: 8px 12px;
          }

          .gallery-save-btn span {
            display: none;
          }

          .gallery-save-btn {
            width: 44px;
            padding: 0;
          }
          
          .alert-overlay {
            top: 70px;
            min-width: 260px;
          }
        }
      `}</style>

      <div className="profile-page">
        <div className="photo-gallery">
          {/* Alert messages - now positioned absolutely inside photo-gallery */}
          {(error || success) && (
            <div className="alert-overlay">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show mb-2 shadow-lg" role="alert" style={{ borderRadius: '12px', border: 'none' }}>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-exclamation-circle me-2 fs-5"></i>
                    <div className="flex-grow-1">{error}</div>
                    <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
                  </div>
                </div>
              )}
              {success && (
                <div className="alert alert-success alert-dismissible fade show mb-2 shadow-lg" role="alert" style={{ borderRadius: '12px', border: 'none' }}>
                  <div className="d-flex align-items-center">
                    <i className="fas fa-check-circle me-2 fs-5"></i>
                    <div className="flex-grow-1">Profile updated successfully!</div>
                    <button type="button" className="btn-close" onClick={() => setSuccess(false)} aria-label="Close"></button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={goBack} className="gallery-back-btn" type="button">
            <i className="fas fa-arrow-left"></i>
          </button>

          {!editing ? (
            <button onClick={() => setEditing(true)} className="gallery-edit-btn" type="button">
              <i className="fas fa-pen"></i>
            </button>
          ) : (
            <button onClick={handleSubmit} className="gallery-save-btn" type="button" disabled={saving}>
              <i className="fas fa-save"></i>
              <span>{saving ? "Saving..." : "Save"}</span>
            </button>
          )}

          {!editing && photos.length > 1 && (
            <div className="photo-count">
              <i className="fas fa-images"></i>
              {activePhotoIndex + 1} / {photos.length}
            </div>
          )}

          {currentPhoto && (
            <img
              src={currentPhoto}
              alt={formatName(user)}
              className="main-photo"
              onClick={() => !editing && openPhotoModal(currentPhoto, activePhotoIndex)}
            />
          )}

          {!editing && photos.length > 1 && (
            <>
              <div className="photo-nav photo-nav-left" onClick={prevPhoto}>
                <button type="button">
                  <i className="fas fa-chevron-left"></i>
                </button>
              </div>
              <div className="photo-nav photo-nav-right" onClick={nextPhoto}>
                <button type="button">
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </>
          )}

          {!editing && photos.length > 1 && (
            <div className="photo-indicators">
              {photos.map((_, index) => (
                <div
                  key={index}
                  className={`photo-indicator ${activePhotoIndex === index ? "active" : ""}`}
                  onClick={() => setActivePhotoIndex(index)}
                />
              ))}
            </div>
          )}

          {!editing && photos.length > 1 && (
            <div className="thumbnail-strip">
              {photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo.image}
                  alt={`Thumbnail ${index + 1}`}
                  className={`thumbnail ${activePhotoIndex === index ? "active" : ""}`}
                  onClick={() => setActivePhotoIndex(index)}
                />
              ))}
            </div>
          )}

          <div className="gallery-overlay">
            <div className="gallery-name">
              {formatName(user)}
              <span className="gallery-age">{calculateAge(user?.birth_date) ? `, ${calculateAge(user?.birth_date)}` : ""}</span>
            </div>

            {user?.location && (
              <div className="gallery-location">
                <i className="fas fa-map-marker-alt"></i>
                {user.location}
              </div>
            )}

            {editing && (
              <div className="top-edit-photo-box">
                <div className="top-edit-photo-actions">
                  <label className="mini-upload-btn" htmlFor="main-photo-upload">
                    <i className="fas fa-camera me-2"></i>
                    Change Main Photo
                  </label>
                  <input
                    id="main-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleMainPhotoChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-section pt-3 pb-0">
            <div className="d-flex justify-content-end">
              {user?.is_verified ? (
                <span className="verification-badge verified-badge">
                  <i className="fas fa-check-circle"></i> Verified Account
                </span>
              ) : (
                <span className="verification-badge unverified-badge">
                  <i className="fas fa-clock"></i> Not Verified
                </span>
              )}
            </div>
          </div>

          <div className="profile-section">
            <h3 className="section-title">
              <i className="fas fa-heart"></i>
              About You
            </h3>

            {!editing ? (
              <>
                <div className="about-text">
                  <i className="fas fa-quote-left me-2"></i>
                  {user?.bio || "You haven't added a bio yet"}
                  <i className="fas fa-quote-right ms-2"></i>
                </div>

                <div className="info-chips">
                  {user?.gender && (
                    <span className="info-chip">
                      <i className="fas fa-venus-mars"></i>
                      {user.gender === "male" ? "Man" : user.gender === "female" ? "Woman" : user.gender}
                    </span>
                  )}

                  {user?.interested_in && (
                    <span className="info-chip">
                      <i className="fas fa-heart"></i>
                      {user.interested_in === "male"
                        ? "Men"
                        : user.interested_in === "female"
                        ? "Women"
                        : "Everyone"}
                    </span>
                  )}

                  {user?.height && (
                    <span className="info-chip">
                      <i className="fas fa-ruler"></i>
                      {user.height} cm
                    </span>
                  )}

                  {calculateAge(user?.birth_date) && (
                    <span className="info-chip">
                      <i className="fas fa-cake-candles"></i>
                      {calculateAge(user.birth_date)} years
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="row g-3">
                <div className="col-12">
                  <label className="edit-form-label">Bio</label>
                  <textarea
                    className="edit-form-control"
                    name="bio"
                    rows="3"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell others about yourself..."
                  />
                </div>

                <div className="col-md-6">
                  <label className="edit-form-label">First Name</label>
                  <input
                    type="text"
                    className="edit-form-control"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="edit-form-label">Last Name</label>
                  <input
                    type="text"
                    className="edit-form-control"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="edit-form-label">Birth Date</label>
                  <input
                    type="date"
                    className="edit-form-control"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="edit-form-label">Height (cm)</label>
                  <input
                    type="number"
                    className="edit-form-control"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    placeholder="e.g. 175"
                  />
                </div>

                <div className="col-md-6">
                  <label className="edit-form-label">Gender</label>
                  <select
                    className="edit-form-control"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="edit-form-label">Interested In</label>
                  <select
                    className="edit-form-control"
                    name="interested_in"
                    value={formData.interested_in}
                    onChange={handleInputChange}
                  >
                    <option value="">Select preference</option>
                    <option value="male">Men</option>
                    <option value="female">Women</option>
                    <option value="everyone">Everyone</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="edit-form-label">Location</label>
                  <input
                    type="text"
                    className="edit-form-control"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                  />
                </div>
              </div>
            )}
          </div>

          {!editing && (
            <div className="profile-section">
              <h3 className="section-title">
                <i className="fas fa-images"></i>
                Your Photos ({userPhotos.length}/10)
              </h3>

              {uploadingPhotos && (
                <div className="text-center py-3">
                  <div className="spinner-border text-danger" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-secondary">Uploading photos...</p>
                </div>
              )}

              <div className="photo-gallery-grid">
                {photoPreview && (
                  <div className="gallery-item">
                    <div className="main-photo-badge">
                      <i className="fas fa-star me-1"></i> Main
                    </div>
                    <img src={photoPreview} alt="Main" onClick={() => openPhotoModal(photoPreview, 0)} />
                  </div>
                )}

                {userPhotos.map((photo) => {
                  if (photoPreview === photo.image) return null;

                  const displayIndex = getAllPhotos().findIndex((p) => p.image === photo.image);

                  return (
                    <div className="gallery-item" key={photo.id}>
                      <img
                        src={photo.image}
                        alt="Gallery"
                        onClick={() => openPhotoModal(photo.image, displayIndex)}
                      />

                      <div className="gallery-item-overlay">
                        <div className="gallery-actions">
                          <button
                            className="gallery-item-btn main-btn"
                            onClick={() => handleSetMainPhoto(photo.image, photo.id)}
                            type="button"
                          >
                            <i className="fas fa-star"></i>
                            Main
                          </button>

                          <button
                            className="gallery-item-btn delete-btn"
                            onClick={() => openDeleteModal(photo)}
                            type="button"
                          >
                            <i className="fas fa-trash"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {userPhotos.length < 10 && (
                  <label htmlFor="gallery-upload" className="upload-placeholder">
                    <i className="fas fa-cloud-upload-alt"></i>
                    <span>Upload</span>
                    <span className="text-muted">{10 - userPhotos.length} left</span>
                    <input
                      type="file"
                      id="gallery-upload"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                      disabled={uploadingPhotos}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {(user?.career || user?.education || editing) && (
            <div className="profile-section">
              <h3 className="section-title">
                <i className="fas fa-briefcase"></i>
                Work & Education
              </h3>

              {!editing ? (
                <div className="professional-grid">
                  {user?.career && (
                    <div className="professional-card">
                      <div className="professional-label">Career</div>
                      <div className="professional-value">
                        <i className="fas fa-briefcase"></i>
                        {user.career}
                      </div>
                    </div>
                  )}

                  {user?.education && (
                    <div className="professional-card">
                      <div className="professional-label">Education</div>
                      <div className="professional-value">
                        <i className="fas fa-graduation-cap"></i>
                        {user.education}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-12">
                    <label className="edit-form-label">Career</label>
                    <input
                      type="text"
                      className="edit-form-control"
                      name="career"
                      value={formData.career}
                      onChange={handleInputChange}
                      placeholder="e.g. Software Engineer"
                    />
                  </div>
                  <div className="col-12">
                    <label className="edit-form-label">Education</label>
                    <input
                      type="text"
                      className="edit-form-control"
                      name="education"
                      value={formData.education}
                      onChange={handleInputChange}
                      placeholder="e.g. University of Example"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {(user?.passions || user?.hobbies || user?.favorite_music || editing) && (
            <div className="profile-section">
              <h3 className="section-title">
                <i className="fas fa-star"></i>
                Interests & Vibes
              </h3>

              {!editing ? (
                <>
                  {user?.passions && (
                    <div className="mb-3">
                      <h6 className="fw-semibold mb-2" style={{ fontSize: "0.9rem", color: "#4a4a4a" }}>
                        <i className="fas fa-fire me-1" style={{ color: "#ff4d6d" }}></i>
                        Passions
                      </h6>
                      <div className="interest-tags">
                        {user.passions.split(",").map((item, index) => (
                          <span key={index} className="interest-tag">
                            <i className="fas fa-heart"></i>
                            {item.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {user?.hobbies && (
                    <div className="mb-3">
                      <h6 className="fw-semibold mb-2" style={{ fontSize: "0.9rem", color: "#4a4a4a" }}>
                        <i className="fas fa-pencil me-1" style={{ color: "#ff4d6d" }}></i>
                        Hobbies
                      </h6>
                      <div className="interest-tags">
                        {user.hobbies.split(",").map((item, index) => (
                          <span key={index} className="interest-tag">
                            <i className="fas fa-heart"></i>
                            {item.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {user?.favorite_music && (
                    <div className="mb-2">
                      <h6 className="fw-semibold mb-2" style={{ fontSize: "0.9rem", color: "#4a4a4a" }}>
                        <i className="fas fa-music me-1" style={{ color: "#ff4d6d" }}></i>
                        Music Vibes
                      </h6>
                      <div className="interest-tags">
                        {user.favorite_music.split(",").map((item, index) => (
                          <span key={index} className="interest-tag">
                            <i className="fas fa-heart"></i>
                            {item.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="row g-3">
                  <div className="col-12">
                    <label className="edit-form-label">Passions</label>
                    <input
                      type="text"
                      className="edit-form-control"
                      name="passions"
                      value={formData.passions}
                      onChange={handleInputChange}
                      placeholder="Separate with commas"
                    />
                  </div>
                  <div className="col-12">
                    <label className="edit-form-label">Hobbies</label>
                    <input
                      type="text"
                      className="edit-form-control"
                      name="hobbies"
                      value={formData.hobbies}
                      onChange={handleInputChange}
                      placeholder="Separate with commas"
                    />
                  </div>
                  <div className="col-12">
                    <label className="edit-form-label">Favorite Music</label>
                    <input
                      type="text"
                      className="edit-form-control"
                      name="favorite_music"
                      value={formData.favorite_music}
                      onChange={handleInputChange}
                      placeholder="Separate with commas"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="action-buttons">
            {editing ? (
              <>
                <button onClick={handleSubmit} className="action-btn primary" disabled={saving} type="button">
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      Save Changes
                    </>
                  )}
                </button>
                <button onClick={cancelEdit} className="action-btn secondary" disabled={saving} type="button">
                  <i className="fas fa-times me-2"></i>
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="action-btn primary" type="button">
                <i className="fas fa-pen me-2"></i>
                Edit Profile
              </button>
            )}
          </div>

          <div className="text-center pb-4">
            <p className="small text-secondary" style={{ fontSize: "0.8rem" }}>
              <i className="fas fa-heart me-1" style={{ color: "#ff4d6d" }}></i>
              Member since {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : "recently"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}