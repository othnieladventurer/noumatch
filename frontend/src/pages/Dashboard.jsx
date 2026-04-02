import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import LeftBlock from "../components/LeftBlock";
import CenterBlock from "../components/CenterBlock";
import RightBlock from "../components/RightBlock";
import Modals from "../components/Modals";
import { getProfilePhotoUrl, calculateAge, shuffleArray } from "../utils/helpers";
import { useNotifications } from '../context/NotificationContext';
import API from '@/api/axios';
import "../styles/Dashboard.css";

const MOBILE_BOTTOM_NAV_HEIGHT = 72;
const PROFILES_PER_PAGE = 15;
const PRELOAD_THRESHOLD = 3;

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [crashError, setCrashError] = useState(null);
  const [activeMobileTab, setActiveMobileTab] = useState('center');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  // Profile states
  const [profiles, setProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Animation states
  const [slideDirection, setSlideDirection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPhotoAnimating, setIsPhotoAnimating] = useState(false);
  const [userPhotos, setUserPhotos] = useState({});
  
  // Modal states
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalPhotos, setModalPhotos] = useState([]);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);
  
  // Interaction states
  const [likesList, setLikesList] = useState([]);
  const [sentLikesIds, setSentLikesIds] = useState([]);
  const [matchesList, setMatchesList] = useState([]);
  const [matchesIds, setMatchesIds] = useState([]);
  const [blockedList, setBlockedList] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [conversations, setConversations] = useState([]);
  
  // Modal controls
  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [selectedLike, setSelectedLike] = useState(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [selectedBlocked, setSelectedBlocked] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [userToReport, setUserToReport] = useState(null);
  
  // Swipe limits
  const [swipeLimits, setSwipeLimits] = useState({
    can_like: true,
    likes_remaining: 10,
    likes_today: 0,
    daily_limit: 10
  });
  
  // Refs for performance
  const likeInProgress = useRef(false);
  const passInProgress = useRef(false);
  const { notifications } = useNotifications();
  
  // Helper functions
  const isMatched = useCallback((profileId) => matchesIds.includes(profileId), [matchesIds]);
  const isLiked = useCallback((profileId) => sentLikesIds.includes(profileId), [sentLikesIds]);
  const isBlocked = useCallback((profileId) => blockedIds.includes(profileId), [blockedIds]);
  
  // Window resize handler
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Error handler
  useEffect(() => {
    const handleError = (event) => {
      console.error('🔥 Caught error:', event.error);
      setCrashError(event.error?.toString() || 'Unknown error');
      event.preventDefault();
    };
    const handleRejection = (event) => {
      console.error('🔥 Unhandled rejection:', event.reason);
      setCrashError(event.reason?.toString() || 'Unhandled promise rejection');
      event.preventDefault();
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  
  if (crashError) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: '#ff4d6d', marginBottom: '20px' }}>Application Error</h1>
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '8px', padding: '20px', maxWidth: '800px', width: '100%', textAlign: 'left', overflow: 'auto' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{crashError}</pre>
        </div>
        <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 30px', background: '#ff4d6d', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer' }}>
          Reload Page
        </button>
      </div>
    );
  }
  
  // Fetch functions
  const fetchSwipeLimits = useCallback(async () => {
    try {
      const response = await API.get("/interactions/swipe/limits/");
      setSwipeLimits(response.data);
    } catch (error) {
      console.error("Error fetching swipe limits:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  }, [navigate]);
  
  const fetchUserPhotos = useCallback(async (userId) => {
    if (!userId) return [];
    try {
      const response = await API.get(`/users/${userId}/photos/`);
      const photos = response.data.map(photo => ({
        id: photo.id,
        image: photo.image_url || getProfilePhotoUrl(photo.image),
        uploaded_at: photo.uploaded_at
      }));
      setUserPhotos(prev => ({ ...prev, [userId]: photos }));
      return photos;
    } catch (error) {
      console.error(`Error fetching photos for user ${userId}:`, error);
      return [];
    }
  }, []);
  
  const fetchConversations = useCallback(async () => {
    try {
      const response = await API.get("/chat/conversations/");
      setConversations(response.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  }, [navigate]);
  
  // Progressive profile loading - users won't notice
  const fetchProfilesBasedOnUser = useCallback(async (page = 1, append = false) => {
    if (!user?.id) return;
    if (append && isLoadingMore) return;
    
    // Only show loading indicator on first load
    if (!append && !initialLoadComplete) {
      setProfilesLoading(true);
    }
    if (append) setIsLoadingMore(true);
    
    try {
      let genderFilter = '';
      if (user.gender === 'male') genderFilter = 'female';
      else if (user.gender === 'female') genderFilter = 'male';
      
      const params = { page, page_size: PROFILES_PER_PAGE };
      if (genderFilter) params.gender = genderFilter;
      
      const response = await API.get("/users/profiles/", { params });
      
      let profilesArray = [];
      if (response.data?.profiles && Array.isArray(response.data.profiles)) {
        profilesArray = response.data.profiles;
        setHasMoreProfiles(!!response.data.next);
      } else if (Array.isArray(response.data)) {
        profilesArray = response.data;
        setHasMoreProfiles(false);
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        profilesArray = response.data.results;
        setHasMoreProfiles(!!response.data.next);
      }
      
      const filteredProfiles = profilesArray.filter(profile => 
        profile.id !== user.id && !blockedIds.includes(profile.id)
      );
      
      let genderFilteredProfiles = filteredProfiles;
      if (genderFilter) {
        genderFilteredProfiles = filteredProfiles.filter(profile => profile.gender === genderFilter);
      }
      
      const transformedProfiles = genderFilteredProfiles.map(profile => ({
        id: profile.id,
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        age: profile.age || calculateAge(profile.birth_date),
        bio: profile.bio || "",
        profile_photo: profile.profile_photo_url || getProfilePhotoUrl(profile.profile_photo),
        photos: [],
        location: profile.location || profile.city || "",
        gender: profile.gender,
        height: profile.height,
        passions: profile.passions,
        career: profile.career,
        education: profile.education,
        hobbies: profile.hobbies,
        favorite_music: profile.favorite_music,
        birth_date: profile.birth_date,
      }));
      
      if (append) {
        // Silently append more profiles
        setProfiles(prev => [...prev, ...transformedProfiles]);
      } else {
        // First load - shuffle for variety
        const shuffledProfiles = shuffleArray(transformedProfiles);
        setProfiles(shuffledProfiles);
        setProfileIndex(0);
        setCurrentPage(1);
        setInitialLoadComplete(true);
        if (shuffledProfiles.length > 0) {
          fetchUserPhotos(shuffledProfiles[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
      if (!append) {
        setApiError(error.message);
        setProfiles([]);
      }
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    } finally {
      setProfilesLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, blockedIds, isLoadingMore, initialLoadComplete, navigate, fetchUserPhotos]);
  
  // Silent background loading - user won't notice
  const loadMoreProfiles = useCallback(() => {
    if (!hasMoreProfiles || isLoadingMore || profilesLoading) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchProfilesBasedOnUser(nextPage, true);
  }, [hasMoreProfiles, isLoadingMore, profilesLoading, currentPage, fetchProfilesBasedOnUser]);
  
  // Interaction fetch functions
  const fetchBlockedUsers = useCallback(async () => {
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
      console.error("Error fetching blocked users:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
      return [];
    }
  }, [navigate]);
  
  const fetchLikesReceived = useCallback(async (currentBlockedIds = blockedIds) => {
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
      console.error("Error fetching likes received:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  }, [blockedIds, navigate]);
  
  const fetchSentLikes = useCallback(async () => {
    try {
      const response = await API.get("/interactions/likes/sent/");
      const likedUserIds = response.data.map(like => like.to_user.id);
      setSentLikesIds(likedUserIds);
    } catch (error) {
      console.error("Error fetching sent likes:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  }, [navigate]);
  
  const fetchMatches = useCallback(async (currentBlockedIds = blockedIds) => {
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
      console.error("Error fetching matches:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  }, [user, blockedIds, navigate]);
  
  const deleteLike = useCallback(async (profileId) => {
    try {
      await API.delete(`/interactions/unlike/${profileId}/`);
      return true;
    } catch (error) {
      console.error("Error deleting like:", error);
      return false;
    }
  }, []);
  
  const deleteMatch = useCallback(async (matchId) => {
    if (!matchId) return false;
    try {
      await API.delete(`/matches/unmatch/${matchId}/`);
      return true;
    } catch (error) {
      console.error("Error deleting match:", error);
      return false;
    }
  }, []);
  
  const trackPass = useCallback(async (profileId) => {
    if (user?.id === profileId || isLiked(profileId)) return;
    try {
      await API.post("/interactions/swipe/pass/", { to_user_id: profileId });
      fetchSwipeLimits();
    } catch (error) {
      console.error("Failed to record pass:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  }, [user, isLiked, fetchSwipeLimits, navigate]);
  
  const createMatch = useCallback(async (otherUserId) => {
    try {
      const response = await API.post("/matches/match/create/", {
        user1_id: user.id,
        user2_id: otherUserId
      });
      return response.status === 201 || response.status === 200;
    } catch (error) {
      console.error("Error creating match:", error);
      return false;
    }
  }, [user]);
  
  const checkForMatch = useCallback(async (likedUserId) => {
    if (isBlocked(likedUserId)) return;
    const theyLikeMe = likesList.some(like => like.id === likedUserId);
    if (theyLikeMe && !matchesIds.includes(likedUserId)) {
      const matchCreated = await createMatch(likedUserId);
      if (matchCreated) {
        await fetchMatches(blockedIds);
        await fetchConversations();
        const matchedProfileFound = likesList.find(like => like.id === likedUserId);
        if (matchedProfileFound) {
          setMatchedProfile(matchedProfileFound);
          setMatchModalOpen(true);
          document.body.style.overflow = 'hidden';
        }
      }
    }
  }, [isBlocked, likesList, matchesIds, createMatch, fetchMatches, fetchConversations, blockedIds]);
  
  // Navigation functions
  const goToMessenger = useCallback(async (profileId) => {
    const conversation = conversations.find(conv => conv.other_user?.id === profileId);
    if (conversation) {
      navigate(`/messages?conversation=${conversation.id}`);
    } else {
      const match = matchesList.find(m => m.id === profileId);
      if (match?.match_id) {
        try {
          const response = await API.post("/chat/conversations/create/", { match_id: match.match_id });
          await fetchConversations();
          navigate(`/messages?conversation=${response.data.id}`);
        } catch (error) {
          console.error("Error creating conversation:", error);
          navigate('/messages');
        }
      } else {
        navigate('/messages');
      }
    }
  }, [conversations, matchesList, navigate, fetchConversations]);
  
  const goToProfile = useCallback((profileId) => navigate(`/profile/${profileId}`), [navigate]);
  const goToMyProfile = useCallback(() => navigate('/profile'), [navigate]);
  const reloadProfiles = useCallback(() => {
    setInitialLoadComplete(false);
    setCurrentPage(1);
    fetchProfilesBasedOnUser(1, false);
  }, [fetchProfilesBasedOnUser]);
  
  // Profile navigation with silent loading
  const goNextProfile = useCallback(() => {
    if (profileIndex < profiles.length - 1) {
      setProfileIndex(prev => prev + 1);
      // Silently load more when approaching the end
      if (profiles.length - (profileIndex + 1) <= PRELOAD_THRESHOLD && hasMoreProfiles && !isLoadingMore) {
        loadMoreProfiles();
      }
    } else if (hasMoreProfiles && !isLoadingMore) {
      // At the end, silently load more
      loadMoreProfiles();
    }
  }, [profileIndex, profiles.length, hasMoreProfiles, isLoadingMore, loadMoreProfiles]);
  
  // Define currentProfile
  const currentProfile = useMemo(() => {
    if (!profiles.length || profileIndex >= profiles.length) return null;
    if (user && profiles[profileIndex]?.id === user.id) {
      setTimeout(() => goNextProfile(), 0);
      return null;
    }
    return profiles[profileIndex];
  }, [profiles, profileIndex, user, goNextProfile]);
  
  // Optimized swipe actions
  const handleLike = useCallback(async () => {
    if (!currentProfile || isAnimating || likeInProgress.current || isBlocked(currentProfile.id)) return;
    if (!swipeLimits.can_like) {
      alert(`Daily like limit reached (${swipeLimits.daily_limit}/day). Upgrade to premium for more!`);
      return;
    }
    
    likeInProgress.current = true;
    setIsAnimating(true);
    
    try {
      await API.post("/interactions/like/", { to_user_id: currentProfile.id });
      await API.post("/interactions/swipe/like/", { to_user_id: currentProfile.id }).catch(() => {});
      
      setSentLikesIds(prev => [...prev, currentProfile.id]);
      await checkForMatch(currentProfile.id);
      fetchSwipeLimits();
      
      setSlideDirection("right");
      setTimeout(() => {
        goNextProfile();
        setSlideDirection(null);
        setIsAnimating(false);
        likeInProgress.current = false;
      }, 250);
    } catch (error) {
      console.error("Error liking profile:", error);
      setIsAnimating(false);
      likeInProgress.current = false;
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  }, [currentProfile, isAnimating, isBlocked, swipeLimits, checkForMatch, fetchSwipeLimits, goNextProfile, navigate]);
  
  const handlePass = useCallback(() => {
    if (!currentProfile || isAnimating || passInProgress.current || isBlocked(currentProfile.id)) return;
    
    passInProgress.current = true;
    setIsAnimating(true);
    trackPass(currentProfile.id);
    
    setSlideDirection("left");
    setTimeout(() => {
      goNextProfile();
      setSlideDirection(null);
      setIsAnimating(false);
      passInProgress.current = false;
    }, 250);
  }, [currentProfile, isAnimating, isBlocked, trackPass, goNextProfile]);
  
  // Photo navigation
  const getCurrentProfilePhotos = useCallback(() => {
    if (!currentProfile) return [];
    const photos = [];
    if (currentProfile.profile_photo) {
      photos.push({ id: 'main', image: currentProfile.profile_photo, is_main: true });
    }
    const galleryPhotos = userPhotos[currentProfile.id] || [];
    galleryPhotos.forEach(photo => photos.push(photo));
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
  
  const goToNextPhoto = useCallback((e) => {
    e?.stopPropagation();
    const photos = getCurrentProfilePhotos();
    if (isPhotoAnimating || photos.length <= 1) return;
    setIsPhotoAnimating(true);
    setTimeout(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
      setIsPhotoAnimating(false);
    }, 200);
  }, [getCurrentProfilePhotos, isPhotoAnimating]);
  
  const goToPrevPhoto = useCallback((e) => {
    e?.stopPropagation();
    const photos = getCurrentProfilePhotos();
    if (isPhotoAnimating || photos.length <= 1) return;
    setIsPhotoAnimating(true);
    setTimeout(() => {
      setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
      setIsPhotoAnimating(false);
    }, 200);
  }, [getCurrentProfilePhotos, isPhotoAnimating]);
  
  const openPhotoModal = useCallback((photoUrl) => {
    if (!currentProfile) return;
    const photos = getCurrentProfilePhotos();
    if (!photos.length) return;
    setModalPhotos(photos.map(p => p.image));
    const index = photos.findIndex(p => p.image === photoUrl);
    setModalPhotoIndex(index >= 0 ? index : currentPhotoIndex);
    setSelectedPhoto(photoUrl);
    setPhotoModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, [currentProfile, getCurrentProfilePhotos, currentPhotoIndex]);
  
  const closePhotoModal = useCallback(() => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
    setModalPhotos([]);
    document.body.style.overflow = 'unset';
  }, []);
  
  // Block/Unblock handlers
  const handleBlock = useCallback(async (profile) => {
    if (!profile) return;
    try {
      const response = await API.post("/blocked/blocks/", { blocked: profile.id });
      if (sentLikesIds.includes(profile.id)) await deleteLike(profile.id);
      if (matchesIds.includes(profile.id)) {
        const match = matchesList.find(m => m.id === profile.id);
        if (match?.match_id) await deleteMatch(match.match_id);
      }
      setBlockedIds(prev => [...prev, profile.id]);
      setBlockedList(prev => {
        if (prev.some(b => b.id === profile.id)) return prev;
        return [{
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          age: profile.age,
          bio: profile.bio,
          photo: profile.photo,
          gender: profile.gender,
          block_id: response.data.id
        }, ...prev];
      });
      setMatchesList(prev => prev.filter(m => m.id !== profile.id));
      setMatchesIds(prev => prev.filter(id => id !== profile.id));
      setLikesList(prev => prev.filter(l => l.id !== profile.id));
      setSentLikesIds(prev => prev.filter(id => id !== profile.id));
      setProfiles(prev => prev.filter(p => p.id !== profile.id));
      if (likeModalOpen) setLikeModalOpen(false);
      if (matchModalOpen) setMatchModalOpen(false);
      fetchConversations();
    } catch (error) {
      console.error("Error blocking user:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
      }
    }
  }, [sentLikesIds, matchesIds, matchesList, deleteLike, deleteMatch, fetchConversations, likeModalOpen, matchModalOpen, navigate]);
  
  const handleUnblock = useCallback(async (profile) => {
    if (!profile) return;
    try {
      await API.delete(`/blocked/blocks/${profile.id}/unblock/`);
      setBlockedIds(prev => prev.filter(id => id !== profile.id));
      setBlockedList(prev => prev.filter(b => b.id !== profile.id));
      setUnblockModalOpen(false);
      setSelectedBlocked(null);
      fetchProfilesBasedOnUser(1, false);
      fetchLikesReceived(blockedIds.filter(id => id !== profile.id));
      fetchMatches(blockedIds.filter(id => id !== profile.id));
      fetchConversations();
    } catch (error) {
      console.error("Error unblocking user:", error);
    }
  }, [fetchProfilesBasedOnUser, fetchLikesReceived, fetchMatches, fetchConversations, blockedIds]);
  
  const openReportModal = useCallback((user) => {
    setUserToReport(user);
    setReportModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);
  
  const closeReportModal = useCallback(() => {
    setReportModalOpen(false);
    setUserToReport(null);
    document.body.style.overflow = 'unset';
  }, []);
  
  const openLikeModal = useCallback((p) => {
    if (user?.account_type === "free") return;
    setSelectedLike(p);
    setLikeModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, [user]);
  
  const closeLikeModal = useCallback(() => {
    setLikeModalOpen(false);
    setSelectedLike(null);
    document.body.style.overflow = 'unset';
  }, []);
  
  const handleLikeBack = useCallback(async () => {
    if (!selectedLike) return;
    try {
      await API.post("/interactions/like/", { to_user_id: selectedLike.id });
      setSentLikesIds(prev => [...prev, selectedLike.id]);
      await checkForMatch(selectedLike.id);
      closeLikeModal();
    } catch (error) {
      console.error("Error returning like:", error);
      closeLikeModal();
    }
  }, [selectedLike, checkForMatch, closeLikeModal]);
  
  const handleUnlikeFromModal = useCallback(async () => {
    if (!selectedLike) return;
    const success = await deleteLike(selectedLike.id);
    if (success) {
      setSentLikesIds(prev => prev.filter(id => id !== selectedLike.id));
      setLikesList(prev => prev.filter(like => like.id !== selectedLike.id));
      closeLikeModal();
    }
  }, [selectedLike, deleteLike, closeLikeModal]);
  
  const handleUnmatch = useCallback(async (profile) => {
    if (!profile?.match_id) return;
    const success = await deleteMatch(profile.match_id);
    if (success) {
      setMatchesList(prev => prev.filter(m => m.id !== profile.id));
      setMatchesIds(prev => prev.filter(id => id !== profile.id));
      setSentLikesIds(prev => prev.filter(id => id !== profile.id));
      setLikesList(prev => prev.filter(like => like.id !== profile.id));
      closeMatchModal();
      fetchConversations();
    }
  }, [deleteMatch, fetchConversations]);
  
  const openMatchModalFor = useCallback((profile) => {
    setMatchedProfile(profile);
    setMatchModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);
  
  const closeMatchModal = useCallback(() => {
    setMatchModalOpen(false);
    setMatchedProfile(null);
    document.body.style.overflow = 'unset';
  }, []);
  
  const openUnblockModal = useCallback((profile) => {
    setSelectedBlocked(profile);
    setUnblockModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);
  
  const closeUnblockModal = useCallback(() => {
    setUnblockModalOpen(false);
    setSelectedBlocked(null);
    document.body.style.overflow = 'unset';
  }, []);
  
  // Effects
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
      } catch (error) {
        console.error("Error fetching user:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);
  
  useEffect(() => {
    if (user) {
      fetchSwipeLimits();
      fetchProfilesBasedOnUser(1, false);
    }
  }, [user, fetchSwipeLimits, fetchProfilesBasedOnUser]);
  
  useEffect(() => {
    if (!user) return;
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
  }, [user, fetchBlockedUsers, fetchLikesReceived, fetchSentLikes, fetchMatches, fetchConversations]);
  
  useEffect(() => {
    setCurrentPhotoIndex(0);
    if (currentProfile?.id) {
      fetchUserPhotos(currentProfile.id);
    }
  }, [currentProfile, fetchUserPhotos]);
  
  useEffect(() => {
    if (!notifications.length || !user) return;
    const lastNotif = notifications[0];
    if (lastNotif.type === 'new_match') {
      fetchMatches(blockedIds);
      fetchConversations();
    } else if (lastNotif.type === 'new_like') {
      fetchLikesReceived(blockedIds);
    } else if (lastNotif.type === 'new_message') {
      fetchConversations();
    }
  }, [notifications, user, blockedIds, fetchMatches, fetchConversations, fetchLikesReceived]);
  
  const centerCardStyle = {
    borderRadius: windowWidth < 992 ? "0px" : "24px",
    transition: "transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1), opacity 0.2s ease",
    transform: slideDirection === "left" ? "translateX(-100%) rotate(-8deg)" : slideDirection === "right" ? "translateX(100%) rotate(8deg)" : "translateX(0)",
    opacity: slideDirection ? 0 : 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    boxShadow: windowWidth < 992 ? "none" : "0 4px 20px rgba(0,0,0,0.1)",
    willChange: "transform, opacity",
  };
  
  // Mobile components
  const MobileBottomNav = () => {
    const isPremiumOrGod = user?.account_type === 'premium' || user?.account_type === 'god_mode';
    return (
      <div className="d-block d-lg-none" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #e9ecef', height: `${MOBILE_BOTTOM_NAV_HEIGHT}px`, padding: '8px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <div className="d-flex justify-content-around align-items-center" style={{ height: '100%' }}>
          <button onClick={() => setActiveMobileTab('center')} className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 ${activeMobileTab === 'center' ? 'text-danger' : 'text-secondary'}`}>
            <i className="fas fa-compass fs-5"></i>
            <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Découvrir</span>
          </button>
          {isPremiumOrGod && (
            <button onClick={() => setActiveMobileTab('likes')} className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 position-relative ${activeMobileTab === 'likes' ? 'text-danger' : 'text-secondary'}`}>
              <i className="fas fa-heart fs-5"></i>
              {likesList.length > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem', padding: '2px 4px' }}>{likesList.length}</span>}
              <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Likes</span>
            </button>
          )}
          <button onClick={() => setActiveMobileTab('matches')} className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 position-relative ${activeMobileTab === 'matches' ? 'text-danger' : 'text-secondary'}`}>
            <i className="fas fa-comments fs-5"></i>
            {matchesList.length > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem', padding: '2px 4px' }}>{matchesList.length}</span>}
            <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Matches</span>
          </button>
          <button onClick={() => setActiveMobileTab('blocks')} className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 ${activeMobileTab === 'blocks' ? 'text-danger' : 'text-secondary'}`}>
            <i className="fas fa-ban fs-5"></i>
            <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Bloqués</span>
          </button>
          <button onClick={() => setActiveMobileTab('profile')} className={`btn btn-link text-decoration-none d-flex flex-column align-items-center p-1 ${activeMobileTab === 'profile' ? 'text-danger' : 'text-secondary'}`}>
            <img src={getProfilePhotoUrl(user?.profile_photo)} alt="profile" className="rounded-circle" style={{ width: '20px', height: '20px', objectFit: 'cover' }} />
            <span className="small mt-1" style={{ fontSize: '0.7rem' }}>Profil</span>
          </button>
        </div>
      </div>
    );
  };
  
  const AvatarRow = ({ items, onClickAvatar }) => (
    <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
      {items.slice(0, 8).map((p) => {
        const displayName = p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.first_name || p.last_name || "";
        return (
          <button key={p.id} type="button" className="p-0 border-0 bg-transparent" onClick={() => onClickAvatar?.(p)} style={{ lineHeight: 0 }}>
            <div className="position-relative">
              <img src={p.photo || "https://via.placeholder.com/42"} alt={displayName || "Utilisateur"} className="rounded-circle" width="42" height="42" style={{ objectFit: "cover", border: "2px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", cursor: "pointer", transition: "transform 0.2s" }} />
            </div>
          </button>
        );
      })}
      {items.length > 8 && <span className="badge bg-light text-dark rounded-pill px-3 py-2" style={{ fontSize: "0.85rem" }}>+{items.length - 8}</span>}
    </div>
  );
  
  const SectionCard = ({ title, count, children }) => (
    <div className="p-3 mt-3" style={{ borderRadius: "20px", background: "linear-gradient(145deg, #ffffff, #f8f9fa)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-semibold" style={{ fontSize: "0.95rem", color: "#2c3e50" }}>{title}</span>
        <span className="badge rounded-pill" style={{ background: "#e9ecef", color: "#495057", padding: "6px 12px" }}>{count}</span>
      </div>
      {children}
    </div>
  );
  
  const renderMobileContent = () => {
    switch(activeMobileTab) {
      case 'likes':
        return (
          <div className="h-100 p-3" style={{ overflowY: 'auto', height: '100%' }}>
            <SectionCard title="Qui vous aiment" count={likesList.length}>
              {likesList.length > 0 ? <AvatarRow items={likesList} onClickAvatar={openLikeModal} /> : <div className="text-center py-3"><div className="text-secondary small"><i className="far fa-heart me-2"></i><div>Aucun like pour le moment</div></div></div>}
            </SectionCard>
          </div>
        );
      case 'matches':
        return (
          <div className="h-100 p-3" style={{ overflowY: 'auto', height: '100%' }}>
            <SectionCard title="Matches" count={matchesList.length}>
              {matchesList.length > 0 ? <AvatarRow items={matchesList} onClickAvatar={openMatchModalFor} /> : <div className="text-center py-3"><div className="text-secondary small"><i className="fas fa-heart me-2"></i><div>Pas encore de matches</div></div></div>}
            </SectionCard>
          </div>
        );
      case 'blocks':
        return (
          <div className="h-100 p-3" style={{ overflowY: 'auto', height: '100%' }}>
            <SectionCard title="Bloqués" count={blockedList.length}>
              {blockedList.length > 0 ? <AvatarRow items={blockedList} onClickAvatar={openUnblockModal} /> : <div className="text-center py-3"><div className="text-secondary small"><i className="fas fa-ban me-2"></i><div>Aucun utilisateur bloqué</div></div></div>}
            </SectionCard>
          </div>
        );
      case 'profile':
        return (
          <div className="h-100 p-3" style={{ overflowY: 'auto', height: '100%' }}>
            <div className="text-center">
              <img src={getProfilePhotoUrl(user?.profile_photo)} alt="profile" className="rounded-circle mb-3" style={{ width: '100px', height: '100px', objectFit: 'cover', border: '3px solid #ff4d6d' }} />
              <h5 className="fw-bold">{user?.first_name} {user?.last_name}</h5>
              <p className="text-secondary small">{user?.email}</p>
              <div className="mt-3">
                <button onClick={goToMyProfile} className="btn btn-outline-danger w-100 mb-2" style={{ borderRadius: '30px' }}>Voir mon profil</button>
                <button onClick={() => { localStorage.removeItem("access"); localStorage.removeItem("refresh"); navigate("/login"); }} className="btn btn-outline-secondary w-100" style={{ borderRadius: '30px' }}>Déconnexion</button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="h-100" style={{ margin: 0, padding: 0 }}>
            <CenterBlock
              profilesLoading={profilesLoading && !initialLoadComplete}
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
              isLoadingMore={false}
            />
          </div>
        );
    }
  };
  
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }
  
  return (
    <>
      <DashboardNavbar user={user} />
      <div className="dashboard-container" style={{ height: windowWidth < 768 ? 'calc(100vh - 64px)' : 'calc(100vh - 72px)', overflow: 'hidden', position: 'relative' }}>
        {user ? (
          <>
            {/* Desktop Layout */}
            <div className={`${windowWidth < 992 ? 'd-none' : 'd-block'}`} style={{ height: '100%', overflow: 'auto' }}>
              <div className={`${windowWidth >= 1200 ? 'container' : 'container-fluid'} h-100 py-3`}>
                <div className="row g-3 h-100">
                  <div className="col-lg-3 col-md-4 h-100">
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
                  <div className="col-lg-6 col-md-8 h-100">
                    <CenterBlock
                      profilesLoading={profilesLoading && !initialLoadComplete}
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
                      isLoadingMore={false}
                    />
                  </div>
                  <div className="col-lg-3 d-none d-lg-block h-100">
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
            
            {/* Mobile Layout */}
            <div className={`${windowWidth < 992 ? 'd-block' : 'd-none'}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: `calc(100% - ${MOBILE_BOTTOM_NAV_HEIGHT}px)`, overflow: 'hidden' }}>
                <div style={{ height: '100%', overflowY: 'auto' }}>
                  {renderMobileContent()}
                </div>
              </div>
            </div>
            {windowWidth < 992 && <MobileBottomNav />}
            
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
              handlePassFromLikeModal={closeLikeModal}
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
        .dashboard-col { transition: all 0.3s ease; }
        .dashboard-container { -webkit-overflow-scrolling: touch; }
        @media (max-width: 991.98px) {
          .dashboard-container { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </>
  );
}