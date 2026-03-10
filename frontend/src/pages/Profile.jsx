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
  
  // Modal state for full photo view
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  
  // Form state - includes ALL fields from the User model
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
    profile_photo: null
  });

  const [photoPreview, setPhotoPreview] = useState(null);

  // Fetch user data on mount
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUserProfile = async () => {
      try {
        // First fetch basic user data from /me/
        const meResponse = await fetch("http://127.0.0.1:8000/api/users/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (meResponse.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
          return;
        }

        if (!meResponse.ok) {
          throw new Error(`Failed to fetch user: ${meResponse.status}`);
        }

        const meData = await meResponse.json();
        console.log("✅ Basic user data:", meData);
        
        // Now fetch full profile data from profiles endpoint using the user's ID
        const profileResponse = await fetch(`http://127.0.0.1:8000/api/users/profiles/${meData.id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let fullUserData = meData;
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log("✅ Full profile data:", profileData);
          // Merge the data, with profile data taking precedence for additional fields
          fullUserData = { ...meData, ...profileData };
        }
        
        setUser(fullUserData);
        
        // Initialize form with all user data
        setFormData({
          first_name: fullUserData.first_name || "",
          last_name: fullUserData.last_name || "",
          bio: fullUserData.bio || "",
          birth_date: fullUserData.birth_date ? fullUserData.birth_date.split('T')[0] : "",
          gender: fullUserData.gender || "",
          interested_in: fullUserData.interested_in || "",
          location: fullUserData.location || "",
          height: fullUserData.height || "",
          passions: fullUserData.passions || "",
          career: fullUserData.career || "",
          education: fullUserData.education || "",
          hobbies: fullUserData.hobbies || "",
          favorite_music: fullUserData.favorite_music || "",
          profile_photo: null
        });
        
        if (fullUserData.profile_photo) {
          setPhotoPreview(getProfilePhotoUrl(fullUserData.profile_photo));
        }
        
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const getProfilePhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/media')) return `http://127.0.0.1:8000${path}`;
    return `http://127.0.0.1:8000${path}`;
  };

  const calculateAge = (birthDate) => {
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, profile_photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("access");
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Append all fields
      Object.keys(formData).forEach(key => {
        if (key === 'profile_photo') {
          if (formData[key] instanceof File) {
            formDataToSend.append('profile_photo', formData[key]);
          }
        } else if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Use the profile update endpoint you created
      const response = await fetch("http://127.0.0.1:8000/api/users/profile/update/", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile");
      }

      const updatedUser = await response.json();
      console.log("✅ Profile updated successfully:", updatedUser);
      
      // Update the user state with the new data
      setUser(prevUser => ({ ...prevUser, ...updatedUser }));
      setSuccess(true);
      setEditing(false);
      
      // Update photo preview if a new photo was uploaded
      if (formData.profile_photo instanceof File) {
        if (updatedUser.profile_photo) {
          setPhotoPreview(getProfilePhotoUrl(updatedUser.profile_photo));
        }
      }
      
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    // Reset form to original user data
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        bio: user.bio || "",
        birth_date: user.birth_date ? user.birth_date.split('T')[0] : "",
        gender: user.gender || "",
        interested_in: user.interested_in || "",
        location: user.location || "",
        height: user.height || "",
        passions: user.passions || "",
        career: user.career || "",
        education: user.education || "",
        hobbies: user.hobbies || "",
        favorite_music: user.favorite_music || "",
        profile_photo: null
      });
      setPhotoPreview(getProfilePhotoUrl(user.profile_photo));
    }
    setError(null);
  };

  const openPhotoModal = () => {
    setPhotoModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    document.body.style.overflow = 'unset';
  };

  const PhotoModal = () => {
    if (!photoModalOpen) return null;

    return (
      <>
        <div
          onClick={closePhotoModal}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.9)",
            zIndex: 999999,
            backdropFilter: "blur(8px)",
            cursor: "pointer",
          }}
        />

        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
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
              maxWidth: "90vw",
              maxHeight: "90vh",
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
                zIndex: 1000001,
              }}
            >
              <i className="fas fa-times"></i>
            </button>
            <img
              src={photoPreview || "https://via.placeholder.com/800"}
              alt="Profile full size"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
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

  if (loading) {
    return (
      <>
        <DashboardNavbar user={user} />
        <div className="container py-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar user={user} />
      
      <style>
        {`
          /* Modern, clean, unisex styling */
          .profile-header {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 4rem 0 3rem 0;
            margin-bottom: 2rem;
          }
          
          .profile-avatar-container {
            position: relative;
            display: inline-block;
            cursor: pointer;
          }
          
          .profile-avatar {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            object-fit: cover;
            transition: transform 0.3s;
          }
          
          .profile-avatar:hover {
            transform: scale(1.05);
          }
          
          .profile-avatar-overlay {
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(255,255,255,0.95);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #2c3e50;
            font-size: 1.2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s;
            border: 2px solid #fff;
          }
          
          .profile-avatar-overlay:hover {
            background: white;
            transform: scale(1.1);
            color: #3498db;
          }
          
          .edit-profile-btn {
            background: white;
            color: #2c3e50;
            border: 2px solid white;
            padding: 0.75rem 2rem;
            border-radius: 30px;
            font-weight: 600;
            font-size: 1rem;
            transition: all 0.3s;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }
          
          .edit-profile-btn:hover {
            background: transparent;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0,0,0,0.2);
          }
          
          .profile-card {
            border-radius: 16px;
            border: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            transition: transform 0.3s;
            height: 100%;
            background: #ffffff;
          }
          
          .profile-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          }
          
          .info-label {
            font-size: 0.8rem;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.25rem;
            font-weight: 500;
          }
          
          .info-value {
            font-size: 1rem;
            color: #2c3e50;
            font-weight: 500;
          }
          
          .form-control:focus, .form-select:focus {
            border-color: #3498db;
            box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
          }
          
          .photo-upload-container {
            position: relative;
            display: inline-block;
            cursor: pointer;
          }
          
          .photo-upload-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s;
            color: white;
            font-size: 2rem;
          }
          
          .photo-upload-container:hover .photo-upload-overlay {
            opacity: 1;
          }
          
          .section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #2c3e50;
            letter-spacing: 0.5px;
            margin-bottom: 1rem;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 0.5rem;
          }

          .display-name {
            font-size: 2.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            letter-spacing: -0.5px;
          }

          .profile-email {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 0.5rem;
          }

          .profile-location {
            font-size: 1rem;
            opacity: 0.8;
          }

          .view-photo-hint {
            font-size: 0.85rem;
            margin-top: 0.5rem;
            opacity: 0.7;
          }
          
          .view-photo-hint i {
            margin-right: 0.3rem;
          }

          .badge-verified {
            background: #28a745;
            color: white;
            padding: 0.35rem 0.65rem;
            border-radius: 30px;
            font-size: 0.75rem;
            font-weight: 500;
          }

          .badge-pending {
            background: #ffc107;
            color: #212529;
            padding: 0.35rem 0.65rem;
            border-radius: 30px;
            font-size: 0.75rem;
            font-weight: 500;
          }

          .stat-item {
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 12px;
            text-align: center;
          }

          .stat-value {
            font-size: 1.5rem;
            font-weight: 600;
            color: #2c3e50;
            line-height: 1.2;
          }

          .stat-label {
            font-size: 0.8rem;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          hr {
            opacity: 0.2;
            margin: 1.5rem 0;
          }
        `}
      </style>

      {/* Photo Modal */}
      <PhotoModal />

      {/* Profile Header - Modern & Clean */}
      <div className="profile-header">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-3 text-center text-md-start">
              {editing ? (
                <div className="photo-upload-container">
                  <img
                    src={photoPreview || "https://via.placeholder.com/200"}
                    alt="Profile"
                    className="profile-avatar"
                  />
                  <div className="photo-upload-overlay">
                    <label htmlFor="photo-upload" className="mb-0" style={{ cursor: 'pointer' }}>
                      <i className="fas fa-camera"></i>
                    </label>
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              ) : (
                <div className="profile-avatar-container" onClick={openPhotoModal}>
                  <img
                    src={photoPreview || "https://via.placeholder.com/200"}
                    alt="Profile"
                    className="profile-avatar"
                  />
                  <div className="profile-avatar-overlay">
                    <i className="fas fa-expand"></i>
                  </div>
                </div>
              )}
              {!editing && (
                <div className="view-photo-hint">
                  <i className="fas fa-search-plus"></i>
                  Click to enlarge
                </div>
              )}
            </div>
            <div className="col-md-6 text-center text-md-start mt-4 mt-md-0">
              <h1 className="display-name">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="profile-email">
                <i className="fas fa-envelope me-2"></i>
                {user?.email}
              </p>
              <p className="profile-location">
                <i className="fas fa-map-marker-alt me-2"></i>
                {user?.location || "Location not specified"}
              </p>
              {user?.birth_date && (
                <p className="profile-location">
                  <i className="fas fa-birthday-cake me-2"></i>
                  {calculateAge(user.birth_date)} years old
                </p>
              )}
              <div className="mt-2">
                {user?.is_verified ? (
                  <span className="badge-verified">
                    <i className="fas fa-check-circle me-1"></i> Verified
                  </span>
                ) : (
                  <span className="badge-pending">
                    <i className="fas fa-clock me-1"></i> Pending Verification
                  </span>
                )}
              </div>
            </div>
            <div className="col-md-3 text-center text-md-end mt-4 mt-md-0">
              {!editing ? (
                <button
                  className="edit-profile-btn"
                  onClick={() => setEditing(true)}
                >
                  <i className="fas fa-edit me-2"></i>
                  Edit Profile
                </button>
              ) : (
                <div>
                  <button
                    className="btn btn-primary me-2 px-4 py-2"
                    onClick={handleSubmit}
                    disabled={saving}
                    style={{ borderRadius: '30px', fontWeight: '500', background: '#3498db', border: 'none' }}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Save
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-outline-light px-4 py-2"
                    onClick={cancelEdit}
                    disabled={saving}
                    style={{ borderRadius: '30px', fontWeight: '500' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      <div className="container mb-4">
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}
        {success && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            <i className="fas fa-check-circle me-2"></i>
            Profile updated successfully!
            <button type="button" className="btn-close" onClick={() => setSuccess(false)}></button>
          </div>
        )}
      </div>

      {/* Profile Content - Clean, Organized Layout */}
      <div className="container pb-5">
        {/* Quick Stats Row */}
        {!editing && user && (
          <div className="row mb-4">
            <div className="col-md-3 col-6 mb-3">
              <div className="stat-item">
                <div className="stat-value">{user.height ? `${user.height}cm` : '—'}</div>
                <div className="stat-label">Height</div>
              </div>
            </div>
            <div className="col-md-3 col-6 mb-3">
              <div className="stat-item">
                <div className="stat-value">
                  {user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '—'}
                </div>
                <div className="stat-label">Gender</div>
              </div>
            </div>
            <div className="col-md-3 col-6 mb-3">
              <div className="stat-item">
                <div className="stat-value">
                  {user.interested_in ? 
                    (user.interested_in === 'male' ? 'Men' : 
                     user.interested_in === 'female' ? 'Women' : 'Everyone') 
                    : '—'}
                </div>
                <div className="stat-label">Interested In</div>
              </div>
            </div>
            <div className="col-md-3 col-6 mb-3">
              <div className="stat-item">
                <div className="stat-value">
                  {user.date_joined ? new Date(user.date_joined).getFullYear() : '—'}
                </div>
                <div className="stat-label">Member Since</div>
              </div>
            </div>
          </div>
        )}

        <div className="row">
          {/* Left Column - Basic Information */}
          <div className="col-lg-6 mb-4">
            <div className="card profile-card p-4 h-100">
              <h4 className="section-title">
                <i className="fas fa-user-circle text-secondary me-2"></i>
                Basic Information
              </h4>
              
              {!editing ? (
                // View Mode
                <div className="row">
                  <div className="col-6 mb-3">
                    <div className="info-label">First Name</div>
                    <div className="info-value">{user?.first_name || "Not set"}</div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="info-label">Last Name</div>
                    <div className="info-value">{user?.last_name || "Not set"}</div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="info-label">Birth Date</div>
                    <div className="info-value">
                      {user?.birth_date ? new Date(user.birth_date).toLocaleDateString() : "Not set"}
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="info-label">Age</div>
                    <div className="info-value">
                      {user?.birth_date ? calculateAge(user.birth_date) : "—"}
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="info-label">Gender</div>
                    <div className="info-value">
                      {user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : "Not set"}
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="info-label">Interested In</div>
                    <div className="info-value">
                      {user?.interested_in ? 
                        (user.interested_in === 'male' ? 'Men' : 
                         user.interested_in === 'female' ? 'Women' : 'Everyone') 
                        : "Not set"}
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="info-label">Height</div>
                    <div className="info-value">
                      {user?.height ? `${user.height} cm` : "Not set"}
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="info-label">Location</div>
                    <div className="info-value">{user?.location || "Not set"}</div>
                  </div>
                  <div className="col-12">
                    <div className="info-label">Bio</div>
                    <div className="info-value">{user?.bio || "No bio yet"}</div>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Birth Date</label>
                    <input
                      type="date"
                      className="form-control"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Height (cm)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      placeholder="e.g., 175"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-select"
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
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Interested In</label>
                    <select
                      className="form-select"
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
                  <div className="col-12 mb-3">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">Bio</label>
                    <textarea
                      className="form-control"
                      name="bio"
                      rows="3"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Tell us about yourself..."
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Professional & Interests */}
          <div className="col-lg-6">
            {/* Professional Information */}
            <div className="card profile-card p-4 mb-4">
              <h4 className="section-title">
                <i className="fas fa-briefcase text-secondary me-2"></i>
                Professional
              </h4>
              
              {!editing ? (
                // View Mode
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="info-label">Career</div>
                    <div className="info-value">{user?.career || "Not set"}</div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="info-label">Education</div>
                    <div className="info-value">{user?.education || "Not set"}</div>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="row">
                  <div className="col-12 mb-3">
                    <label className="form-label">Career</label>
                    <input
                      type="text"
                      className="form-control"
                      name="career"
                      value={formData.career}
                      onChange={handleInputChange}
                      placeholder="e.g., Software Engineer"
                    />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">Education</label>
                    <input
                      type="text"
                      className="form-control"
                      name="education"
                      value={formData.education}
                      onChange={handleInputChange}
                      placeholder="e.g., University of Example"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Interests & Hobbies */}
            <div className="card profile-card p-4">
              <h4 className="section-title">
                <i className="fas fa-heart text-secondary me-2"></i>
                Interests & Hobbies
              </h4>
              
              {!editing ? (
                // View Mode
                <div className="row">
                  <div className="col-12 mb-3">
                    <div className="info-label">Passions</div>
                    <div className="info-value">{user?.passions || "Not set"}</div>
                  </div>
                  <div className="col-12 mb-3">
                    <div className="info-label">Hobbies</div>
                    <div className="info-value">{user?.hobbies || "Not set"}</div>
                  </div>
                  <div className="col-12 mb-3">
                    <div className="info-label">Favorite Music</div>
                    <div className="info-value">{user?.favorite_music || "Not set"}</div>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="row">
                  <div className="col-12 mb-3">
                    <label className="form-label">Passions</label>
                    <input
                      type="text"
                      className="form-control"
                      name="passions"
                      value={formData.passions}
                      onChange={handleInputChange}
                      placeholder="What are you passionate about?"
                    />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">Hobbies</label>
                    <input
                      type="text"
                      className="form-control"
                      name="hobbies"
                      value={formData.hobbies}
                      onChange={handleInputChange}
                      placeholder="Your hobbies"
                    />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label">Favorite Music</label>
                    <input
                      type="text"
                      className="form-control"
                      name="favorite_music"
                      value={formData.favorite_music}
                      onChange={handleInputChange}
                      placeholder="Music genres, artists, etc."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card profile-card p-4">
              <h4 className="section-title">
                <i className="fas fa-cog text-secondary me-2"></i>
                Account Information
              </h4>
              
              <div className="row">
                <div className="col-md-3 col-6 mb-3">
                  <div className="info-label">Username</div>
                  <div className="info-value">@{user?.username || "Not set"}</div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="info-label">Email</div>
                  <div className="info-value">{user?.email || "Not set"}</div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="info-label">Status</div>
                  <div className="info-value">
                    {user?.is_verified ? (
                      <span className="badge-verified">Verified</span>
                    ) : (
                      <span className="badge-pending">Pending</span>
                    )}
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="info-label">Joined</div>
                  <div className="info-value">
                    {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}