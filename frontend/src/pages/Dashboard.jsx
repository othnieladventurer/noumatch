import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import LeftBlock from "../components/LeftBlock";
import CenterBlock from "../components/CenterBlock";
import RightBlock from "../components/RightBlock";
import Modals from "../components/Modals";
import { getProfilePhotoUrl, calculateAge, shuffleArray, formatName } from "../utils/helpers";
import { useNotifications } from '../context/NotificationContext';
import API from '@/api/axios';
import "../styles/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [crashError, setCrashError] = useState(null);
  const [activeMobileTab, setActiveMobileTab] = useState('center');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global error catcher
  useEffect(() => {
    const handleError = (event) => {
      try {
        console.error('🔥 Caught error:', event.error);
        setCrashError(event.error?.toString() || 'Unknown error');
        event.preventDefault();
      } catch (e) {
        console.error('Error in error handler:', e);
      }
    };

    const handleRejection = (event) => {
      try {
        console.error('🔥 Unhandled rejection:', event.reason);
        setCrashError(event.reason?.toString() || 'Unhandled promise rejection');
        event.preventDefault();
      } catch (e) {
        console.error('Error in rejection handler:', e);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Show error if caught
  if (crashError) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        color: '#333'
      }}>
        <h1 style={{ color: '#ff4d6d', marginBottom: '20px' }}>Application Error</h1>
        <div style={{
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '800px',
          width: '100%',
          textAlign: 'left',
          overflow: 'auto'
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {crashError}
          </pre>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 30px',
            background: '#ff4d6d',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  // Profile discovery
  const [profiles, setProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [slideDirection, setSlideDirection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Photo gallery state
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoSlideDirection, setPhotoSlideDirection] = useState(null);
  const [isPhotoAnimating, setIsPhotoAnimating] = useState(false);
  const [userPhotos, setUserPhotos] = useState({});

  // Photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalPhotos, setModalPhotos] = useState([]);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);

  // Lists
  const [likesList, setLikesList] = useState([]);
  const [sentLikesIds, setSentLikesIds] = useState([]);
  const [matchesList, setMatchesList] = useState([]);
  const [matchesIds, setMatchesIds] = useState([]);
  const [blockedList, setBlockedList] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [conversations, setConversations] = useState([]);

  // Modals
  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [selectedLike, setSelectedLike] = useState(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [selectedBlocked, setSelectedBlocked] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [userToReport, setUserToReport] = useState(null);

  // Swipe limits state
  const [swipeLimits, setSwipeLimits] = useState({
    can_like: true,
    likes_remaining: 10,
    likes_today: 0,
    daily_limit: 10
  });

  const { notifications } = useNotifications();

  const isMatched = (profileId) => matchesIds.includes(profileId);
  const isLiked = (profileId) => sentLikesIds.includes(profileId);
  const isBlocked = (profileId) => blockedIds.includes(profileId);

  const fetchSwipeLimits = async () => {
    try {
      const response = await API.get("/interactions/swipe/limits/");
      setSwipeLimits(response.data);
      console.log("📊 Swipe limits updated:", response.data);
    } catch (error) {
      console.error("Error fetching swipe limits:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const getConversationId = (userId) => {
    const conversation = conversations.find(conv => conv.other_user?.id === userId);
    return conversation?.id;
  };

  const goToMessenger = async (profileId) => {
    const conversationId = getConversationId(profileId);
    
    if (conversationId) {
      navigate(`/messages?conversation=${conversationId}`);
    } else {
      try {
        const match = matchesList.find(m => m.id === profileId);
        
        if (!match) {
          console.error("Aucun match trouvé pour cet utilisateur");
          navigate('/messages');
          return;
        }
        
        const response = await API.post("/chat/conversations/create/", { match_id: match.match_id });
        await fetchConversations();
        navigate(`/messages?conversation=${response.data.id}`);
      } catch (error) {
        console.error("Erreur lors de la création de la conversation:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
        } else {
          navigate('/messages');
        }
      }
    }
  };

  const goToMessages = () => navigate('/messages');
  const goToProfile = (profileId) => navigate(`/profile/${profileId}`);
  const goToMyProfile = () => navigate('/profile');

  const fetchUserPhotos = async (userId) => {
    if (!userId) return [];
    
    try {
      const response = await API.get(`/users/${userId}/photos/`);
      const photos = response.data.map(photo => ({
        id: photo.id,
        image: photo.image_url || getProfilePhotoUrl(photo.image),
        uploaded_at: photo.uploaded_at
      }));
      
      setUserPhotos(prev => ({
        ...prev,
        [userId]: photos
      }));
      
      return photos;
    } catch (error) {
      console.error(`Erreur lors de la récupération des photos pour l'utilisateur ${userId}:`, error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
      return [];
    }
  };

  const fetchConversations = async () => {
    console.log("📡 [DASHBOARD] fetchConversations called");
    try {
      const response = await API.get("/chat/conversations/");
      setConversations(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await API.get("/users/me/");
        setUser({
          ...response.data,
          profile_photo: response.data.profile_photo_url || response.data.profile_photo
        });
        console.log("👤 User loaded:", response.data.email, "Account type:", response.data.account_type);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
        }
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchSwipeLimits();
    }
  }, [user]);

  const fetchBlockedUsers = async () => {
    try {
      const response = await API.get("/blocked/blocks/");
      
      const blocked = response.data.map(block => ({
        id: block.blocked,
        first_name: block.blocked_user.first_name || "",
        last_name: block.blocked_user.last_name || "",
        age: block.blocked_user.age,
        bio: block.blocked_user.bio || "",
        photo: block.blocked_user.profile_photo_url || getProfilePhotoUrl(block.blocked_user.profile_photo),
        gender: block.blocked_user.gender,
        block_id: block.id,
        created_at: block.created_at
      }));
      
      setBlockedList(blocked);
      const blockedIdsArray = blocked.map(b => b.id);
      setBlockedIds(blockedIdsArray);
      
      return blockedIdsArray;
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs bloqués:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
      return [];
    }
  };

  const fetchLikesReceived = async (currentBlockedIds = blockedIds) => {
    console.log("📡 [DASHBOARD] fetchLikesReceived called with blockedIds:", currentBlockedIds);
    try {
      const response = await API.get("/interactions/likes/received/");
      
      const likes = response.data.map(like => {
        let age = like.from_user.age;
        if (!age && like.from_user.birth_date) {
          age = calculateAge(like.from_user.birth_date);
        }
        
        return {
          id: like.from_user.id,
          first_name: like.from_user.first_name || "",
          last_name: like.from_user.last_name || "",
          age: age,
          bio: like.from_user.bio || "",
          photo: like.from_user.profile_photo_url || getProfilePhotoUrl(like.from_user.profile_photo),
          gender: like.from_user.gender,
        };
      });
      
      const filteredLikes = likes.filter(like => !currentBlockedIds.includes(like.id));
      setLikesList(filteredLikes);
    } catch (error) {
      console.error("Erreur lors de la récupération des likes reçus:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const fetchSentLikes = async () => {
    try {
      const response = await API.get("/interactions/likes/sent/");
      const likedUserIds = response.data.map(like => like.to_user.id);
      setSentLikesIds(likedUserIds);
    } catch (error) {
      console.error("Erreur lors de la récupération des likes envoyés:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const fetchMatches = async (currentBlockedIds = blockedIds) => {
    console.log("📡 [DASHBOARD] fetchMatches called with blockedIds:", currentBlockedIds);
    if (!user) return;
    
    try {
      const response = await API.get("/matches/matches/");
      
      const matches = response.data.map(match => {
        const otherUser = match.user1.id === user.id ? match.user2 : match.user1;
        return {
          id: otherUser.id,
          first_name: otherUser.first_name || "",
          last_name: otherUser.last_name || "",
          age: otherUser.age,
          bio: otherUser.bio || "",
          photo: otherUser.profile_photo_url || getProfilePhotoUrl(otherUser.profile_photo),
          gender: otherUser.gender,
          match_id: match.id,
          created_at: match.created_at
        };
      });
      
      const filteredMatches = matches.filter(match => !currentBlockedIds.includes(match.id));
      setMatchesList(filteredMatches);
      setMatchesIds(filteredMatches.map(m => m.id));
    } catch (error) {
      console.error("Erreur lors de la récupération des matches:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const createMatch = async (otherUserId) => {
    try {
      const response = await API.post("/matches/match/create/", {
        user1_id: user.id,
        user2_id: otherUserId
      });
      
      return response.status === 201 || response.status === 200;
    } catch (error) {
      console.error("Erreur lors de la création du match:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
      return false;
    }
  };

  const deleteLike = async (profileId) => {
    try {
      await API.delete(`/interactions/unlike/${profileId}/`);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression du like:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
      return false;
    }
  };

  const deleteMatch = async (matchId) => {
    if (!matchId) return false;
    
    try {
      await API.delete(`/matches/unmatch/${matchId}/`);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression du match:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
      return false;
    }
  };

  const trackPass = async (profileId) => {
    console.log("🔍 ===== PASS TRACKING DEBUG =====");
    console.log("🔍 Attempting to track pass for user ID:", profileId);
    console.log("🔍 Current user:", user?.id, user?.email);
    console.log("🔍 Token exists:", !!localStorage.getItem("access"));
    
    if (user?.id === profileId) {
      console.error("❌ Cannot pass on yourself!");
      return;
    }
    
    if (isLiked(profileId)) {
      console.error("❌ Cannot pass on someone you've already liked!");
      return;
    }
    
    try {
      const response = await API.post("/interactions/swipe/pass/", { to_user_id: profileId });
      console.log("✅ Pass recorded successfully for user:", profileId);
      fetchSwipeLimits();
    } catch (error) {
      console.error("❌ Failed to record pass.", error);
      if (error.response) {
        console.error("❌ Error details:", error.response.data);
        if (error.response.status === 400) {
          if (error.response.data?.error?.includes("already passed")) {
            console.warn("⚠️ You have already passed on this user");
          } else if (error.response.data?.error?.includes("already liked")) {
            console.warn("⚠️ You cannot pass on someone you've already liked");
          } else if (error.response.data?.error?.includes("pass on yourself")) {
            console.warn("⚠️ Cannot pass on yourself");
          }
        } else if (error.response.status === 401) {
          console.error("❌ Authentication error - token may be expired");
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
        } else if (error.response.status === 429) {
          console.error("❌ Rate limit exceeded");
        }
      } else if (error.request) {
        console.error("❌ No response from server");
      }
    }
    console.log("🔍 ===== END PASS DEBUG =====");
  };

  const handleUnlike = async (profileId) => {
    const success = await deleteLike(profileId);
    if (success) {
      setSentLikesIds(prev => prev.filter(id => id !== profileId));
      if (matchesIds.includes(profileId)) {
        removeFromMatches(profileId);
      }
      setLikesList(prev => prev.filter(like => like.id !== profileId));
    }
    return success;
  };

  const handleUnmatch = async (profile) => {
    if (!profile || !profile.match_id) return;
    
    const success = await deleteMatch(profile.match_id);
    if (success) {
      removeFromMatches(profile.id);
      closeMatchModal();
      fetchConversations();
    }
  };

  const checkForMatch = async (likedUserId) => {
    if (isBlocked(likedUserId)) return;
    
    const theyLikeMe = likesList.some(like => like.id === likedUserId);
    
    if (theyLikeMe) {
      const matchCreated = await createMatch(likedUserId);
      
      if (matchCreated) {
        await fetchMatches(blockedIds);
        await fetchConversations();
        const matchedProfile = likesList.find(like => like.id === likedUserId);
        setMatchedProfile(matchedProfile);
        setMatchModalOpen(true);
        document.body.style.overflow = 'hidden';
      }
    }
  };

  const handleBlock = async (profile) => {
    if (!profile) return;
    
    try {
      const response = await API.post("/blocked/blocks/", { blocked: profile.id });

      const data = response.data;
      
      if (sentLikesIds.includes(profile.id)) {
        await deleteLike(profile.id);
      }
      
      if (matchesIds.includes(profile.id)) {
        const match = matchesList.find(m => m.id === profile.id);
        if (match && match.match_id) {
          await deleteMatch(match.match_id);
        }
      }
      
      const newBlockedIds = [...blockedIds, profile.id];
      setBlockedIds(newBlockedIds);
      
      const blockedProfile = {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        age: profile.age,
        bio: profile.bio,
        photo: profile.photo,
        gender: profile.gender,
        block_id: data.id
      };
      
      setBlockedList(prev => {
        if (prev.some(b => b.id === profile.id)) return prev;
        return [blockedProfile, ...prev];
      });
      
      removeFromMatches(profile.id);
      removeFromLikes(profile.id);
      removeFromDiscover(profile.id);
      
      if (likeModalOpen) closeLikeModal();
      if (matchModalOpen) closeMatchModal();
      
      fetchConversations();
    } catch (error) {
      console.error("Erreur lors du blocage de l'utilisateur:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const handleUnblock = async (profile) => {
    if (!profile) return;
    
    try {
      await API.delete(`/blocked/blocks/${profile.id}/unblock/`);

      const newBlockedIds = blockedIds.filter(id => id !== profile.id);
      setBlockedIds(newBlockedIds);
      setBlockedList(prev => prev.filter(b => b.id !== profile.id));
      setUnblockModalOpen(false);
      setSelectedBlocked(null);
      
      if (user) {
        fetchProfilesBasedOnUser(newBlockedIds);
        fetchLikesReceived(newBlockedIds);
        fetchMatches(newBlockedIds);
        fetchConversations();
      }
    } catch (error) {
      console.error("Erreur lors du déblocage de l'utilisateur:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  };

  const openReportModal = (user) => {
    setUserToReport(user);
    setReportModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeReportModal = () => {
    setReportModalOpen(false);
    setUserToReport(null);
    document.body.style.overflow = 'unset';
  };

  useEffect(() => {
    if (!user) {
      console.log("⏸️ [DASHBOARD] No user yet, skipping notification effect");
      return;
    }
    
    console.log("🔔 [DASHBOARD] notifications array changed, length:", notifications.length);
    console.log("   Current notifications:", notifications.map(n => ({ id: n.id, type: n.type, read: n.is_read })));
    
    if (!notifications.length) {
      console.log("   No notifications, skipping refresh");
      return;
    }
    
    const lastNotif = notifications[0];
    console.log("🔄 [DASHBOARD] New notification detected:", lastNotif.type, "ID:", lastNotif.id);
    
    const refreshData = async () => {
      console.log("   [DASHBOARD] blockedIds at refresh time:", blockedIds);
      
      if (lastNotif.type === 'new_match') {
        console.log("🎯 [DASHBOARD] Refreshing matches...");
        try {
          await fetchMatches(blockedIds);
          await fetchConversations();
          console.log("✅ [DASHBOARD] Matches refreshed");
        } catch (err) {
          console.error("❌ [DASHBOARD] Error refreshing matches:", err);
        }
      } else if (lastNotif.type === 'new_like') {
        console.log("💕 [DASHBOARD] Refreshing likes...");
        try {
          await fetchLikesReceived(blockedIds);
          console.log("✅ [DASHBOARD] Likes refreshed");
        } catch (err) {
          console.error("❌ [DASHBOARD] Error refreshing likes:", err);
        }
      } else if (lastNotif.type === 'new_message') {
        console.log("💬 [DASHBOARD] Refreshing conversations...");
        try {
          await fetchConversations();
          console.log("✅ [DASHBOARD] Conversations refreshed");
        } catch (err) {
          console.error("❌ [DASHBOARD] Error refreshing conversations:", err);
        }
      } else {
        console.log("❓ [DASHBOARD] Unknown notification type:", lastNotif.type);
      }
    };
    
    refreshData();
  }, [notifications, user, blockedIds]);

  const fetchProfilesBasedOnUser = async (currentBlockedIds = blockedIds) => {
    if (!user || !user.id) {
      console.log("⚠️ Cannot fetch profiles: user not ready");
      return;
    }
    
    const safeBlockedIds = Array.isArray(currentBlockedIds) ? currentBlockedIds : [];
    
    setProfilesLoading(true);
    setApiError(null);
    
    try {
      let genderFilter = '';
      if (user.gender === 'male') {
        genderFilter = 'female';
      } else if (user.gender === 'female') {
        genderFilter = 'male';
      }

      const params = {};
      if (genderFilter) {
        params.gender = genderFilter;
      }
      
      const response = await API.get("/users/profiles/", { params });

      let profilesArray = [];
      if (Array.isArray(response.data)) {
        profilesArray = response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        profilesArray = response.data.results;
      }

      const filteredById = profilesArray.filter(profile => 
        profile.id !== user.id && !safeBlockedIds.includes(profile.id)
      );

      let genderFilteredProfiles = filteredById;
      if (genderFilter) {
        genderFilteredProfiles = filteredById.filter(profile => profile.gender === genderFilter);
      }

      const transformedProfiles = genderFilteredProfiles.map(profile => ({
        id: profile.id,
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        age: profile.age || calculateAge(profile.birth_date),
        bio: profile.bio || "",
        profile_photo: profile.profile_photo_url || getProfilePhotoUrl(profile.profile_photo),
        photos: [],
        location: profile.location || "",
        gender: profile.gender,
        height: profile.height,
        passions: profile.passions,
        career: profile.career,
        education: profile.education,
        hobbies: profile.hobbies,
        favorite_music: profile.favorite_music,
        birth_date: profile.birth_date,
      }));

      const shuffledProfiles = shuffleArray(transformedProfiles);
      setProfiles(shuffledProfiles);
      setProfileIndex(0);
      
      if (shuffledProfiles.length > 0) {
        fetchUserPhotos(shuffledProfiles[0].id);
      }

    } catch (error) {
      console.error("Erreur lors de la récupération des profils:", error);
      setApiError(error.message);
      setProfiles([]);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    fetchProfilesBasedOnUser();
  }, [user, blockedIds]);

  useEffect(() => {
    if (!user || !user.id) return;
    
    const fetchAllInteractions = async () => {
      const blockedIdsArray = await fetchBlockedUsers();
      await Promise.all([
        fetchLikesReceived(blockedIdsArray),
        fetchSentLikes(),
        fetchMatches(blockedIdsArray),
        fetchConversations()
      ]);
    };
    
    fetchAllInteractions();
  }, [user]);

  const currentProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    if (profileIndex >= profiles.length) return null;
    
    if (user && profiles[profileIndex] && profiles[profileIndex].id === user.id) {
      setTimeout(() => goNextProfile(), 0);
      return null;
    }
    
    return profiles[profileIndex];
  }, [profiles, profileIndex, user]);

  const getCurrentProfilePhotos = useCallback(() => {
    if (!currentProfile) return [];
    
    const photos = [];
    
    if (currentProfile.profile_photo) {
      photos.push({
        id: 'main',
        image: currentProfile.profile_photo,
        is_main: true
      });
    }
    
    const galleryPhotos = userPhotos[currentProfile.id] || [];
    galleryPhotos.forEach(photo => {
      photos.push(photo);
    });
    
    return photos;
  }, [currentProfile, userPhotos]);

  const getCurrentPhotoUrl = useCallback(() => {
    if (!currentProfile) return null;
    
    const photos = getCurrentProfilePhotos();
    if (photos.length > 0 && currentPhotoIndex < photos.length) {
      return photos[currentPhotoIndex]?.image;
    }
    return currentProfile.profile_photo;
  }, [currentProfile, currentPhotoIndex, getCurrentProfilePhotos]);

  const goToNextPhoto = (e) => {
    e?.stopPropagation();
    const photos = getCurrentProfilePhotos();
    if (isPhotoAnimating || photos.length <= 1) return;
    
    setPhotoSlideDirection("right");
    setIsPhotoAnimating(true);
    
    setTimeout(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
      setPhotoSlideDirection(null);
      setIsPhotoAnimating(false);
    }, 200);
  };

  const goToPrevPhoto = (e) => {
    e?.stopPropagation();
    const photos = getCurrentProfilePhotos();
    if (isPhotoAnimating || photos.length <= 1) return;
    
    setPhotoSlideDirection("left");
    setIsPhotoAnimating(true);
    
    setTimeout(() => {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
      setPhotoSlideDirection(null);
      setIsPhotoAnimating(false);
    }, 200);
  };

  useEffect(() => {
    setCurrentPhotoIndex(0);
    setPhotoSlideDirection(null);
    setIsPhotoAnimating(false);
    
    if (currentProfile?.id) {
      fetchUserPhotos(currentProfile.id);
    }
  }, [currentProfile]);

  const openPhotoModal = (photoUrl, profileId) => {
    if (!currentProfile) return;
    
    const photos = getCurrentProfilePhotos();
    if (!photos.length) return;
    
    setModalPhotos(photos.map(p => p.image));
    const index = photos.findIndex(p => p.image === photoUrl);
    setModalPhotoIndex(index >= 0 ? index : currentPhotoIndex);
    setSelectedPhoto(photoUrl);
    setPhotoModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
    setModalPhotos([]);
    document.body.style.overflow = 'unset';
  };

  const goNextProfile = () => {
    if (profileIndex < profiles.length - 1) {
      setProfileIndex((prev) => prev + 1);
    } else {
      setProfileIndex(profiles.length);
    }
  };

  const reloadProfiles = () => {
    if (!user || !user.id) {
      console.log("⚠️ Cannot reload profiles: user not ready");
      return;
    }
    
    const safeBlockedIds = Array.isArray(blockedIds) ? blockedIds : [];
    
    console.log("🔄 Reloading profiles with blockedIds:", safeBlockedIds);
    fetchProfilesBasedOnUser(safeBlockedIds);
  };

  const triggerSlide = (direction) => {
    if (isAnimating) return;
    setSlideDirection(direction);
    setIsAnimating(true);

    setTimeout(() => {
      goNextProfile();
      setSlideDirection(null);
      setIsAnimating(false);
    }, 300);
  };

  const existsById = (arr, id) => arr.some((x) => x.id === id);

  const addToMatches = (profile) => {
    setMatchesList((prev) => (existsById(prev, profile.id) ? prev : [profile, ...prev]));
    setMatchesIds((prev) => [...prev, profile.id]);
  };

  const removeFromMatches = (id) => {
    setMatchesList((prev) => prev.filter((x) => x.id !== id));
    setMatchesIds((prev) => prev.filter(mId => mId !== id));
  };

  const removeFromLikes = (id) => {
    setLikesList((prev) => prev.filter((x) => x.id !== id));
    setSentLikesIds((prev) => prev.filter(likedId => likedId !== id));
  };

  const removeFromDiscover = (id) => {
    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;

      const next = prev.filter((p) => p.id !== id);

      setProfileIndex((pi) => {
        if (pi > idx) return pi - 1;
        if (pi === idx) return pi;
        return pi;
      });

      return next;
    });
  };

  const handlePass = () => {
    if (!currentProfile || isAnimating || isBlocked(currentProfile.id)) return;
    
    console.log("👆 Pass button clicked for user:", currentProfile.id, currentProfile.first_name);
    
    trackPass(currentProfile.id);
    triggerSlide("left");
  };
  
  const handleLike = async () => {
    if (!currentProfile || isAnimating || isBlocked(currentProfile.id)) return;
    
    console.log("❤️ Like button clicked for user:", currentProfile.id, currentProfile.first_name);
    console.log("📊 Current swipe limits:", swipeLimits);
    
    if (!swipeLimits.can_like) {
      alert(`Daily like limit reached (${swipeLimits.daily_limit}/day). Upgrade to premium for more!`);
      return;
    }
    
    try {
      const likeResponse = await API.post("/interactions/like/", { to_user_id: currentProfile.id });

      console.log("❤️ Like response status:", likeResponse.status);

      if (likeResponse.status === 429) {
        alert(`Daily like limit reached (${likeResponse.data.limit}/day)!`);
        fetchSwipeLimits();
        return;
      }

      console.log("✅ Like recorded successfully in database");
      
      await API.post("/interactions/swipe/like/", { to_user_id: currentProfile.id })
        .catch(err => console.warn("Swipe tracking failed but like was created:", err));
      
      setSentLikesIds(prev => [...prev, currentProfile.id]);
      await checkForMatch(currentProfile.id);
      fetchSwipeLimits();
    } catch (error) {
      console.error("❌ Erreur lors du like du profil:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }

    triggerSlide("right");
  };

  const openLikeModal = (p) => {
    if (user?.account_type === "free") {
      return;
    }
    
    setSelectedLike(p);
    setLikeModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLikeModal = () => {
    setLikeModalOpen(false);
    setSelectedLike(null);
    document.body.style.overflow = 'unset';
  };

  const handlePassFromLikeModal = () => {
    closeLikeModal();
  };

  const handleLikeBack = async () => {
    if (!selectedLike) return;

    try {
      const response = await API.post("/interactions/like/", { to_user_id: selectedLike.id });

      setSentLikesIds(prev => [...prev, selectedLike.id]);
      await checkForMatch(selectedLike.id);
      closeLikeModal();
    } catch (error) {
      console.error("❌ Échec du like retourné:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
      closeLikeModal();
    }
  };

  const handleUnlikeFromModal = async () => {
    if (!selectedLike) return;
    
    const success = await handleUnlike(selectedLike.id);
    if (success) {
      removeFromLikes(selectedLike.id);
      closeLikeModal();
    }
  };

  const openMatchModalFor = (profile) => {
    setMatchedProfile(profile);
    setMatchModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeMatchModal = () => {
    setMatchModalOpen(false);
    setMatchedProfile(null);
    document.body.style.overflow = 'unset';
  };

  const openUnblockModal = (profile) => {
    setSelectedBlocked(profile);
    setUnblockModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeUnblockModal = () => {
    setUnblockModalOpen(false);
    setSelectedBlocked(null);
    document.body.style.overflow = 'unset';
  };

  const centerCardStyle = {
    borderRadius: windowWidth < 992 ? "0px" : "24px",
    transition: "transform 0.3s ease, opacity 0.3s ease",
    transform:
      slideDirection === "left"
        ? "translateX(-100%) rotate(-8deg)"
        : slideDirection === "right"
        ? "translateX(100%) rotate(8deg)"
        : "translateX(0)",
    opacity: slideDirection ? 0 : 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    boxShadow: windowWidth < 992 ? "none" : "0 4px 20px rgba(0,0,0,0.1)",
  };

  // Mobile bottom navigation component with reduced height
  const MobileBottomNav = () => {
    const isPremiumOrGod = user?.account_type === 'premium' || user?.account_type === 'god_mode';
    
    return (
      <div 
        className="d-block d-lg-none" 
        style={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#ffffff',
          borderTop: '1px solid #e9ecef',
          padding: '8px 0',
          zIndex: 1000,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
          margin: 0,
        }}
      >
        <div className="d-flex justify-content-around align-items-center">
          <button
            onClick={() => setActiveMobileTab('center')}
            className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 ${activeMobileTab === 'center' ? 'text-danger' : 'text-secondary'}`}
            style={{ transition: 'all 0.2s' }}
          >
            <i className={`fas ${activeMobileTab === 'center' ? 'fa-compass' : 'fa-compass'} fs-5`}></i>
            <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Découvrir</span>
          </button>

          {/* Only show Likes tab for Premium/God users */}
          {isPremiumOrGod && (
            <button
              onClick={() => setActiveMobileTab('likes')}
              className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 position-relative ${activeMobileTab === 'likes' ? 'text-danger' : 'text-secondary'}`}
            >
              <i className="fas fa-heart fs-5"></i>
              {likesList.length > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem', padding: '2px 4px' }}>
                  {likesList.length}
                </span>
              )}
              <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Likes</span>
            </button>
          )}

          <button
            onClick={() => setActiveMobileTab('matches')}
            className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 position-relative ${activeMobileTab === 'matches' ? 'text-danger' : 'text-secondary'}`}
          >
            <i className="fas fa-comments fs-5"></i>
            {matchesList.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem', padding: '2px 4px' }}>
                {matchesList.length}
              </span>
            )}
            <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Matches</span>
          </button>

          <button
            onClick={() => setActiveMobileTab('blocks')}
            className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 position-relative ${activeMobileTab === 'blocks' ? 'text-danger' : 'text-secondary'}`}
          >
            <i className="fas fa-ban fs-5"></i>
            {blockedList.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-secondary" style={{ fontSize: '0.6rem', padding: '2px 4px' }}>
                {blockedList.length}
              </span>
            )}
            <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Bloqués</span>
          </button>

          <button
            onClick={() => setActiveMobileTab('profile')}
            className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 ${activeMobileTab === 'profile' ? 'text-danger' : 'text-secondary'}`}
          >
            <img
              src={getProfilePhotoUrl(user?.profile_photo)}
              alt="profile"
              className="rounded-circle"
              style={{ width: '20px', height: '20px', objectFit: 'cover' }}
            />
            <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Profil</span>
          </button>
        </div>
      </div>
    );
  };

  // Helper components for mobile
  const AvatarRow = ({ items, onClickAvatar }) => (
    <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
      {items.slice(0, 8).map((p) => {
        const displayName = p.first_name && p.last_name 
          ? `${p.first_name} ${p.last_name}` 
          : p.first_name || p.last_name || "";
        
        return (
          <button
            key={p.id}
            type="button"
            className="p-0 border-0 bg-transparent"
            onClick={() => onClickAvatar?.(p)}
            style={{ lineHeight: 0 }}
            aria-label={displayName ? `Ouvrir le profil de ${displayName}` : "Ouvrir le profil"}
          >
            <div className="position-relative">
              <img
                src={p.photo || "https://via.placeholder.com/42"}
                alt={displayName || "Utilisateur"}
                className="rounded-circle"
                width="42"
                height="42"
                style={{
                  objectFit: "cover",
                  border: "2px solid #fff",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              />
            </div>
          </button>
        );
      })}

      {items.length > 8 && (
        <span className="badge bg-light text-dark rounded-pill px-3 py-2" style={{ fontSize: "0.85rem" }}>
          +{items.length - 8}
        </span>
      )}
    </div>
  );

  const SectionCard = ({ title, count, children }) => (
    <div
      className="p-3 mt-3"
      style={{
        borderRadius: "20px",
        background: "linear-gradient(145deg, #ffffff, #f8f9fa)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-semibold" style={{ fontSize: "0.95rem", color: "#2c3e50" }}>{title}</span>
        <span className="badge rounded-pill" style={{ background: "#e9ecef", color: "#495057", padding: "6px 12px" }}>{count}</span>
      </div>
      {children}
    </div>
  );

  // Mobile content renderer
  const renderMobileContent = () => {
    switch(activeMobileTab) {
      case 'likes':
        return (
          <div className="h-100 p-3" style={{ overflowY: 'auto', height: '100%' }}>
            <div className="scrollable-card p-3">
              <SectionCard title="Qui vous aiment" count={likesList.length}>
                {likesList.length > 0 ? (
                  <AvatarRow items={likesList} onClickAvatar={openLikeModal} />
                ) : (
                  <div className="text-center py-3">
                    <div className="text-secondary small">
                      <i className="far fa-heart me-2" style={{ opacity: 0.5, fontSize: "1.2rem" }}></i>
                      <div>Aucun like pour le moment</div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        );
      case 'matches':
        return (
          <div className="h-100 p-3" style={{ overflowY: 'auto', height: '100%' }}>
            <div className="scrollable-card p-3">
              <SectionCard title="Matches" count={matchesList.length}>
                {matchesList.length > 0 ? (
                  <AvatarRow items={matchesList} onClickAvatar={openMatchModalFor} />
                ) : (
                  <div className="text-center py-3">
                    <div className="text-secondary small">
                      <i className="fas fa-heart me-2" style={{ opacity: 0.5, fontSize: "1.2rem" }}></i>
                      <div>Pas encore de matches</div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        );
      case 'blocks':
        return (
          <div className="h-100 p-3" style={{ overflowY: 'auto', height: '100%' }}>
            <div className="scrollable-card p-3">
              <SectionCard title="Bloqués" count={blockedList.length}>
                {blockedList.length > 0 ? (
                  <AvatarRow items={blockedList} onClickAvatar={openUnblockModal} />
                ) : (
                  <div className="text-center py-3">
                    <div className="text-secondary small">
                      <i className="fas fa-ban me-2" style={{ opacity: 0.5, fontSize: "1.2rem" }}></i>
                      <div>Aucun utilisateur bloqué</div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="h-100 p-3" style={{ overflowY: 'auto', height: '100%' }}>
            <div className="scrollable-card p-3">
              <div className="text-center">
                <img
                  src={getProfilePhotoUrl(user?.profile_photo)}
                  alt="profile"
                  className="rounded-circle mb-3"
                  style={{ width: '100px', height: '100px', objectFit: 'cover', border: '3px solid #ff4d6d' }}
                />
                <h5 className="fw-bold">
                  {user?.first_name} {user?.last_name}
                </h5>
                <p className="text-secondary small">{user?.email}</p>
                <div className="mt-3">
                  <button
                    onClick={goToMyProfile}
                    className="btn btn-outline-danger w-100 mb-2"
                    style={{ borderRadius: '30px' }}
                  >
                    Voir mon profil
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem("access");
                      localStorage.removeItem("refresh");
                      navigate("/login");
                    }}
                    className="btn btn-outline-secondary w-100"
                    style={{ borderRadius: '30px' }}
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="h-100" style={{ height: '100%', margin: 0, padding: 0 }}>
            <CenterBlock
              profilesLoading={profilesLoading}
              apiError={apiError}
              profiles={profiles}
              profileIndex={profileIndex}
              currentProfile={currentProfile}
              getCurrentPhotoUrl={getCurrentPhotoUrl}
              openPhotoModal={openPhotoModal}
              getCurrentProfilePhotos={getCurrentProfilePhotos}
              currentPhotoIndex={currentPhotoIndex}
              setCurrentPhotoIndex={setCurrentPhotoIndex}
              goToPrevPhoto={goToPrevPhoto}
              goToNextPhoto={goToNextPhoto}
              isPhotoAnimating={isPhotoAnimating}
              isMatched={isMatched}
              isLiked={isLiked}
              goToProfile={goToProfile}
              handlePass={handlePass}
              handleLike={handleLike}
              isAnimating={isAnimating}
              goToMessenger={goToMessenger}
              setMatchedProfile={setMatchedProfile}
              setMatchModalOpen={setMatchModalOpen}
              openReportModal={openReportModal}
              handleBlock={handleBlock}
              centerCardStyle={centerCardStyle}
              reloadProfiles={reloadProfiles}
              swipeLimits={swipeLimits}
            />
          </div>
        );
    }
  };

  return (
    <>
      <DashboardNavbar user={user} />
      
      {/* Main container with responsive height */}
      <div 
        className="dashboard-container" 
        style={{ 
          height: windowWidth < 768 ? 'calc(100vh - 64px)' : 'calc(100vh - 72px)',
          overflow: 'hidden',
          position: 'relative',
          margin: 0,
          padding: 0
        }}
      >
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "100%" }}>
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : user ? (
          <>
            {/* Desktop/Tablet Layout - visible on md and up */}
            <div className={`${windowWidth < 992 ? 'd-none' : 'd-block'}`} style={{ height: '100%', overflow: 'auto' }}>
              <div className={`${windowWidth >= 1200 ? 'container' : 'container-fluid'} h-100 py-3`}>
                <div className="row g-3 h-100 dashboard-row">
                  {/* LEFT BLOCK - visible on md and up */}
                  <div className={`${windowWidth >= 992 ? 'col-lg-3 col-md-4' : 'd-none'} order-2 order-md-1 h-100 dashboard-col`}>
                    <LeftBlock 
                      user={user}
                      likesList={likesList}
                      matchesList={matchesList}
                      blockedList={blockedList}
                      openLikeModal={openLikeModal}
                      openMatchModalFor={openMatchModalFor}
                      openUnblockModal={openUnblockModal}
                      goToMyProfile={goToMyProfile}
                    />
                  </div>

                  {/* CENTER BLOCK - always visible */}
                  <div className={`${windowWidth >= 992 ? 'col-lg-6 col-md-8' : 'col-12'} order-1 order-md-2 h-100 dashboard-col center-col`}>
                    <CenterBlock
                      profilesLoading={profilesLoading}
                      apiError={apiError}
                      profiles={profiles}
                      profileIndex={profileIndex}
                      currentProfile={currentProfile}
                      getCurrentPhotoUrl={getCurrentPhotoUrl}
                      openPhotoModal={openPhotoModal}
                      getCurrentProfilePhotos={getCurrentProfilePhotos}
                      currentPhotoIndex={currentPhotoIndex}
                      setCurrentPhotoIndex={setCurrentPhotoIndex}
                      goToPrevPhoto={goToPrevPhoto}
                      goToNextPhoto={goToNextPhoto}
                      isPhotoAnimating={isPhotoAnimating}
                      isMatched={isMatched}
                      isLiked={isLiked}
                      goToProfile={goToProfile}
                      handlePass={handlePass}
                      handleLike={handleLike}
                      isAnimating={isAnimating}
                      goToMessenger={goToMessenger}
                      setMatchedProfile={setMatchedProfile}
                      setMatchModalOpen={setMatchModalOpen}
                      openReportModal={openReportModal}
                      handleBlock={handleBlock}
                      centerCardStyle={centerCardStyle}
                      reloadProfiles={reloadProfiles}
                      swipeLimits={swipeLimits}
                    />
                  </div>

                  {/* RIGHT BLOCK - visible on lg and up */}
                  <div className={`${windowWidth >= 992 ? 'col-lg-3 d-block' : 'd-none'} order-3 h-100 dashboard-col`}>
                    <RightBlock
                      currentProfile={currentProfile}
                      getCurrentProfilePhotos={getCurrentProfilePhotos}
                      isMatched={isMatched}
                      isLiked={isLiked}
                      goToProfile={goToProfile}
                      goToMessenger={goToMessenger}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Layout - visible only on small screens */}
            <div className={`${windowWidth < 992 ? 'd-block' : 'd-none'}`} style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              margin: 0,
              padding: 0
            }}>
              {/* Content area - fills available space */}
              <div style={{ 
                flex: 1, 
                minHeight: 0, 
                position: 'relative',
                margin: 0,
                padding: 0
              }}>
                <div style={{ 
                  height: '100%', 
                  width: '100%',
                  overflowY: 'auto',
                  margin: 0,
                  padding: 0
                }}>
                  {renderMobileContent()}
                </div>
              </div>
            </div>

            {/* Mobile bottom navigation - only on small screens */}
            {windowWidth < 992 && <MobileBottomNav />}

            {/* MODALS */}
            <Modals
              user={user}
              likeModalOpen={likeModalOpen}
              closeLikeModal={closeLikeModal}
              selectedLike={selectedLike}
              openPhotoModal={openPhotoModal}
              isMatched={isMatched}
              goToProfile={goToProfile}
              goToMessenger={goToMessenger}
              handleUnlikeFromModal={handleUnlikeFromModal}
              handleBlock={handleBlock}
              openReportModal={openReportModal}
              handlePassFromLikeModal={handlePassFromLikeModal}
              handleLikeBack={handleLikeBack}
              matchModalOpen={matchModalOpen}
              closeMatchModal={closeMatchModal}
              matchedProfile={matchedProfile}
              handleUnmatch={handleUnmatch}
              unblockModalOpen={unblockModalOpen}
              closeUnblockModal={closeUnblockModal}
              selectedBlocked={selectedBlocked}
              handleUnblock={handleUnblock}
              photoModalOpen={photoModalOpen}
              closePhotoModal={closePhotoModal}
              modalPhotos={modalPhotos}
              modalPhotoIndex={modalPhotoIndex}
              setModalPhotoIndex={setModalPhotoIndex}
              selectedPhoto={selectedPhoto}
              setSelectedPhoto={setSelectedPhoto}
              reportModalOpen={reportModalOpen}
              closeReportModal={closeReportModal}
              userToReport={userToReport}
            />
          </>
        ) : (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "100%" }}>
            <p className="text-secondary">Impossible de charger les données utilisateur.</p>
          </div>
        )}
      </div>

      <style>{`
        /* Smooth transitions for responsive changes */
        .dashboard-col {
          transition: all 0.3s ease;
        }
        
        .center-card {
          transition: all 0.3s ease;
        }
        
        /* Ensure proper scrolling on all devices */
        .dashboard-container {
          -webkit-overflow-scrolling: touch;
        }
        
        /* Remove any extra space on mobile */
        @media (max-width: 991.98px) {
          .dashboard-container {
            padding: 0 !important;
            margin: 0 !important;
          }
          .center-card {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
        }
      `}</style>
    </>
  );
}