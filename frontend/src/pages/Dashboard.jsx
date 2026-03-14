import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";
import LeftBlock from "../components/LeftBlock";
import CenterBlock from "../components/CenterBlock";
import RightBlock from "../components/RightBlock";
import Modals from "../components/Modals";
import { getProfilePhotoUrl, calculateAge, shuffleArray, formatName } from "../utils/helpers";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
  const [userPhotos, setUserPhotos] = useState({}); // Store photos by user ID

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
  
  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [userToReport, setUserToReport] = useState(null);

  // Swipe limits state
  const [swipeLimits, setSwipeLimits] = useState({
    can_like: true,
    likes_remaining: 10,
    likes_today: 0,
    daily_limit: 10
  });

  // Check if user is matched with a profile
  const isMatched = (profileId) => matchesIds.includes(profileId);

  // Check if user has liked a profile
  const isLiked = (profileId) => sentLikesIds.includes(profileId);

  // Check if user is blocked
  const isBlocked = (profileId) => blockedIds.includes(profileId);

  // Fetch swipe limits
  const fetchSwipeLimits = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/swipe/limits/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSwipeLimits(data);
        console.log("📊 Swipe limits updated:", data);
      }
    } catch (error) {
      console.error("Error fetching swipe limits:", error);
    }
  };

  // Get conversation ID for a matched user
  const getConversationId = (userId) => {
    const conversation = conversations.find(conv => conv.other_user?.id === userId);
    return conversation?.id;
  };

  // Navigate to messenger
  const goToMessenger = async (profileId) => {
    const conversationId = getConversationId(profileId);
    
    if (conversationId) {
      navigate(`/messages?conversation=${conversationId}`);
    } else {
      try {
        const token = localStorage.getItem("access");
        const match = matchesList.find(m => m.id === profileId);
        
        if (!match) {
          console.error("Aucun match trouvé pour cet utilisateur");
          navigate('/messages');
          return;
        }
        
        const response = await fetch("http://127.0.0.1:8000/api/chat/conversations/create/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ match_id: match.match_id }),
        });

        if (response.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
          return;
        }

        if (response.ok) {
          const newConversation = await response.json();
          await fetchConversations();
          navigate(`/messages?conversation=${newConversation.id}`);
        } else {
          navigate('/messages');
        }
      } catch (error) {
        console.error("Erreur lors de la création de la conversation:", error);
        navigate('/messages');
      }
    }
  };

  const goToMessages = () => navigate('/messages');
  const goToProfile = (profileId) => navigate(`/profile/${profileId}`);
  const goToMyProfile = () => navigate('/profile');

  // Fetch user photos
  const fetchUserPhotos = async (userId) => {
    if (!userId) return [];
    
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/users/${userId}/photos/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const photos = data.map(photo => ({
          id: photo.id,
          image: getProfilePhotoUrl(photo.image_url || photo.image),
          uploaded_at: photo.uploaded_at
        }));
        
        setUserPhotos(prev => ({
          ...prev,
          [userId]: photos
        }));
        
        return photos;
      }
    } catch (error) {
      console.error(`Erreur lors de la récupération des photos pour l'utilisateur ${userId}:`, error);
    }
    return [];
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/chat/conversations/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error);
    }
  };

  // Fetch authenticated user
  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/users/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(`Échec de la récupération de l'utilisateur: ${response.status}`);
        }

        const data = await response.json();
        setUser(data);
        console.log("👤 User loaded:", data.email, "Account type:", data.account_type);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  // Fetch swipe limits when user loads
  useEffect(() => {
    if (user) {
      fetchSwipeLimits();
    }
  }, [user]);

  // Fetch blocked users
  const fetchBlockedUsers = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/blocked/blocks/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        
        const blocked = data.map(block => ({
          id: block.blocked,
          first_name: block.blocked_user.first_name || "",
          last_name: block.blocked_user.last_name || "",
          age: block.blocked_user.age,
          bio: block.blocked_user.bio || "",
          photo: getProfilePhotoUrl(block.blocked_user.profile_photo),
          gender: block.blocked_user.gender,
          block_id: block.id,
          created_at: block.created_at
        }));
        
        setBlockedList(blocked);
        const blockedIdsArray = blocked.map(b => b.id);
        setBlockedIds(blockedIdsArray);
        
        return blockedIdsArray;
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs bloqués:", error);
      return [];
    }
  };

  // Fetch likes received
  const fetchLikesReceived = async (currentBlockedIds = blockedIds) => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/likes/received/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        
        const likes = data.map(like => {
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
            photo: getProfilePhotoUrl(like.from_user.profile_photo),
            gender: like.from_user.gender,
          };
        });
        
        const filteredLikes = likes.filter(like => !currentBlockedIds.includes(like.id));
        setLikesList(filteredLikes);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des likes reçus:", error);
    }
  };

  // Fetch likes sent
  const fetchSentLikes = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/likes/sent/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        const likedUserIds = data.map(like => like.to_user.id);
        setSentLikesIds(likedUserIds);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des likes envoyés:", error);
    }
  };

  // Fetch matches
  const fetchMatches = async (currentBlockedIds = blockedIds) => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/matches/matches/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        
        const matches = data.map(match => {
          const otherUser = match.user1.id === user.id ? match.user2 : match.user1;
          return {
            id: otherUser.id,
            first_name: otherUser.first_name || "",
            last_name: otherUser.last_name || "",
            age: otherUser.age,
            bio: otherUser.bio || "",
            photo: getProfilePhotoUrl(otherUser.profile_photo),
            gender: otherUser.gender,
            match_id: match.id,
            created_at: match.created_at
          };
        });
        
        const filteredMatches = matches.filter(match => !currentBlockedIds.includes(match.id));
        setMatchesList(filteredMatches);
        setMatchesIds(filteredMatches.map(m => m.id));
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des matches:", error);
    }
  };

  // Create match
  const createMatch = async (otherUserId) => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/matches/match/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user1_id: user.id,
          user2_id: otherUserId
        }),
      });
      
      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return false;
      }
      
      const data = await response.json();
      
      if (response.status === 201 || response.status === 200) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la création du match:", error);
      return false;
    }
  };

  // Delete like
  const deleteLike = async (profileId) => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/interactions/unlike/${profileId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return false;
      }

      if (response.ok || response.status === 204) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du like:", error);
      return false;
    }
  };

  // Delete match
  const deleteMatch = async (matchId) => {
    if (!matchId) return false;
    
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/matches/unmatch/${matchId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return false;
      }

      if (response.ok || response.status === 204) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du match:", error);
      return false;
    }
  };

  // Track pass in database
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
      const token = localStorage.getItem("access");
      const requestBody = JSON.stringify({ to_user_id: profileId });
      console.log("🔍 Request body:", requestBody);
      
      const response = await fetch("http://127.0.0.1:8000/api/interactions/swipe/pass/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: requestBody,
      });
      
      console.log("🔍 Response status:", response.status);
      
      let responseData;
      try {
        responseData = await response.json();
        console.log("🔍 Response data:", responseData);
      } catch (e) {
        console.log("🔍 Could not parse response as JSON");
        responseData = await response.text();
        console.log("🔍 Response text:", responseData);
      }
      
      if (response.ok) {
        console.log("✅ Pass recorded successfully for user:", profileId);
        fetchSwipeLimits();
      } else {
        console.error("❌ Failed to record pass. Status:", response.status);
        console.error("❌ Error details:", responseData);
        
        if (response.status === 400) {
          if (responseData?.error?.includes("already passed")) {
            console.warn("⚠️ You have already passed on this user");
          } else if (responseData?.error?.includes("already liked")) {
            console.warn("⚠️ You cannot pass on someone you've already liked");
          } else if (responseData?.error?.includes("pass on yourself")) {
            console.warn("⚠️ Cannot pass on yourself");
          }
        } else if (response.status === 401) {
          console.error("❌ Authentication error - token may be expired");
        } else if (response.status === 429) {
          console.error("❌ Rate limit exceeded");
        }
      }
    } catch (error) {
      console.error("❌ Network error tracking pass:", error);
    }
    console.log("🔍 ===== END PASS DEBUG =====");
  };

  // Unlike a profile
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

  // Unmatch a profile
  const handleUnmatch = async (profile) => {
    if (!profile || !profile.match_id) return;
    
    const success = await deleteMatch(profile.match_id);
    if (success) {
      removeFromMatches(profile.id);
      closeMatchModal();
      fetchConversations();
    }
  };

  // Check for match
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

  // Block a user
  const handleBlock = async (profile) => {
    if (!profile) return;
    
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/blocked/blocks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          blocked: profile.id 
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        
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
      } else {
        const error = await response.json();
        console.error("❌ Échec du blocage:", error);
      }
    } catch (error) {
      console.error("Erreur lors du blocage de l'utilisateur:", error);
    }
  };

  // Unblock a user
  const handleUnblock = async (profile) => {
    if (!profile) return;
    
    try {
      const token = localStorage.getItem("access");
      const response = await fetch(`http://127.0.0.1:8000/api/blocked/blocks/${profile.id}/unblock/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }

      if (response.ok || response.status === 204) {
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
      } else {
        console.error("❌ Échec du déblocage");
      }
    } catch (error) {
      console.error("Erreur lors du déblocage de l'utilisateur:", error);
    }
  };

  // Report functions
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

  // Fetch profiles
  const fetchProfilesBasedOnUser = async (currentBlockedIds = blockedIds) => {
    if (!user || !user.id) return;
    
    setProfilesLoading(true);
    setApiError(null);
    
    try {
      const token = localStorage.getItem("access");
      if (!token) {
        navigate("/login");
        return;
      }

      let genderFilter = '';
      if (user.interested_in === 'male') {
        genderFilter = 'male';
      } else if (user.interested_in === 'female') {
        genderFilter = 'female';
      } else if (user.interested_in === 'everyone') {
        // No filter
      }

      const queryParams = new URLSearchParams();
      if (genderFilter) {
        queryParams.append('gender', genderFilter);
      }
      
      const apiUrl = `http://127.0.0.1:8000/api/users/profiles/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();

      let profilesArray = [];
      if (Array.isArray(data)) {
        profilesArray = data;
      } else if (data.results && Array.isArray(data.results)) {
        profilesArray = data.results;
      }

      const filteredById = profilesArray.filter(profile => 
        profile.id !== user.id && !currentBlockedIds.includes(profile.id)
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
        profile_photo: getProfilePhotoUrl(profile.profile_photo),
        photos: [],
        location: profile.location || "",
        gender: profile.gender,
        interested_in: profile.interested_in,
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
    } finally {
      setProfilesLoading(false);
    }
  };

  // Fetch profiles when user or blockedIds change
  useEffect(() => {
    fetchProfilesBasedOnUser();
  }, [user, blockedIds]);

  // Fetch all interactions when user loads
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

  // Get current profile
  const currentProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    if (profileIndex >= profiles.length) return null;
    
    if (user && profiles[profileIndex] && profiles[profileIndex].id === user.id) {
      setTimeout(() => goNextProfile(), 0);
      return null;
    }
    
    return profiles[profileIndex];
  }, [profiles, profileIndex, user]);

  // Get photos for current profile
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

  // Get current photo URL
  const getCurrentPhotoUrl = useCallback(() => {
    if (!currentProfile) return null;
    
    const photos = getCurrentProfilePhotos();
    if (photos.length > 0 && currentPhotoIndex < photos.length) {
      return photos[currentPhotoIndex]?.image;
    }
    return currentProfile.profile_photo;
  }, [currentProfile, currentPhotoIndex, getCurrentProfilePhotos]);

  // Photo navigation
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

  // Reset photo index when profile changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
    setPhotoSlideDirection(null);
    setIsPhotoAnimating(false);
    
    if (currentProfile?.id) {
      fetchUserPhotos(currentProfile.id);
    }
  }, [currentProfile]);

  // Open photo modal
  const openPhotoModal = (photoUrl, profileId) => {
    if (!currentProfile) return;
    
    const photos = getCurrentProfilePhotos();
    if (photos.length > 0) {
      setModalPhotos(photos.map(p => p.image));
      const index = photos.findIndex(p => p.image === photoUrl);
      setModalPhotoIndex(index >= 0 ? index : currentPhotoIndex);
    } else {
      setModalPhotos([currentProfile.profile_photo]);
      setModalPhotoIndex(0);
    }
    
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
    window.location.reload();
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

  // UPDATED: handlePass
  const handlePass = () => {
    if (!currentProfile || isAnimating || isBlocked(currentProfile.id)) return;
    
    console.log("👆 Pass button clicked for user:", currentProfile.id, currentProfile.first_name);
    
    trackPass(currentProfile.id);
    triggerSlide("left");
  };
  
  // UPDATED: handleLike - NOW CALLS BOTH ENDPOINTS
  const handleLike = async () => {
    if (!currentProfile || isAnimating || isBlocked(currentProfile.id)) return;
    
    console.log("❤️ Like button clicked for user:", currentProfile.id, currentProfile.first_name);
    console.log("📊 Current swipe limits:", swipeLimits);
    
    if (!swipeLimits.can_like) {
      alert(`Daily like limit reached (${swipeLimits.daily_limit}/day). Upgrade to premium for more!`);
      return;
    }
    
    try {
      const token = localStorage.getItem("access");
      
      // 1. First create the actual Like (this triggers the notification via signal)
      const likeResponse = await fetch("http://127.0.0.1:8000/api/interactions/like/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          to_user_id: currentProfile.id 
        }),
      });

      console.log("❤️ Like response status:", likeResponse.status);

      if (likeResponse.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }

      if (likeResponse.status === 429) {
        const data = await likeResponse.json();
        alert(`Daily like limit reached (${data.limit}/day)!`);
        fetchSwipeLimits();
        return;
      }

      if (likeResponse.ok) {
        console.log("✅ Like recorded successfully in database");
        
        // 2. Then track the swipe count separately
        await fetch("http://127.0.0.1:8000/api/interactions/swipe/like/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            to_user_id: currentProfile.id 
          }),
        }).catch(err => console.warn("Swipe tracking failed but like was created:", err));
        
        setSentLikesIds(prev => [...prev, currentProfile.id]);
        await checkForMatch(currentProfile.id);
        fetchSwipeLimits();
      } else {
        const error = await likeResponse.json();
        console.error("❌ Échec du like:", error);
      }
    } catch (error) {
      console.error("❌ Erreur lors du like du profil:", error);
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
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/like/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          to_user_id: selectedLike.id 
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }

      if (response.ok) {
        setSentLikesIds(prev => [...prev, selectedLike.id]);
        await checkForMatch(selectedLike.id);
        closeLikeModal();
      } else {
        const error = await response.json();
        console.error("❌ Échec du like retourné:", error);
        closeLikeModal();
      }
    } catch (error) {
      console.error("Erreur lors du like retourné:", error);
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
    borderRadius: "24px",
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
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  };

  return (
    <>
      <DashboardNavbar user={user} />
      
      <div className="dashboard-container container">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "100%" }}>
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : user ? (
          <div className="container-fluid h-100 py-3">
            <div className="row g-3 h-100 dashboard-row">
              {/* LEFT BLOCK */}
              <div className="col-lg-3 col-md-4 order-2 order-md-1 h-100 dashboard-col">
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

              {/* CENTER BLOCK */}
              <div className="col-lg-6 col-md-8 order-1 order-md-2 h-100 dashboard-col center-col">
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

              {/* RIGHT BLOCK */}
              <div className="col-lg-3 d-none d-lg-block order-3 h-100 dashboard-col">
                <RightBlock
                  currentProfile={currentProfile}
                  getCurrentProfilePhotos={getCurrentProfilePhotos}
                  isMatched={isMatched}
                  isLiked={isLiked}
                  goToProfile={goToProfile}
                  goToMessenger={goToMessenger}
                />
              </div>

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
            </div>
          </div>
        ) : (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "100%" }}>
            <p className="text-secondary">Impossible de charger les données utilisateur.</p>
          </div>
        )}
      </div>
    </>
  );
}