import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "../components/DashboardNavbar";

import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [slideDirection, setSlideDirection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Lists
  const [likesList, setLikesList] = useState([]);
  const [sentLikesIds, setSentLikesIds] = useState([]);
  const [matchesList, setMatchesList] = useState([]);
  const [matchesIds, setMatchesIds] = useState([]);
  
  // Block list
  const [blockedList, setBlockedList] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);

  // Conversations for message linking
  const [conversations, setConversations] = useState([]);

  // Modals
  const [likeModalOpen, setLikeModalOpen] = useState(false);
  const [selectedLike, setSelectedLike] = useState(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [selectedBlocked, setSelectedBlocked] = useState(null);

  // Helper function to format name for main card and sidebar
  const formatName = (profile) => {
    if (!profile) return "";
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile.first_name) return profile.first_name;
    if (profile.last_name) return profile.last_name;
    return "";
  };

  // Check if user is matched with a profile
  const isMatched = (profileId) => {
    return matchesIds.includes(profileId);
  };

  // Check if user has liked a profile
  const isLiked = (profileId) => {
    return sentLikesIds.includes(profileId);
  };

  // Check if user is blocked
  const isBlocked = (profileId) => {
    return blockedIds.includes(profileId);
  };

  // Get conversation ID for a matched user
  const getConversationId = (userId) => {
    const conversation = conversations.find(conv => 
      conv.other_user?.id === userId
    );
    return conversation?.id;
  };

  // Navigate to messenger with conversation - create if doesn't exist
  const goToMessenger = async (profileId) => {
    // First check if conversation exists
    const conversationId = getConversationId(profileId);
    
    if (conversationId) {
      // If exists, go to messenger with that conversation
      navigate(`/messages?conversation=${conversationId}`);
    } else {
      // If not, find the match and create a conversation
      try {
        const token = localStorage.getItem("access");
        
        // Find the match for this user
        const match = matchesList.find(m => m.id === profileId);
        
        if (!match) {
          console.error("Aucun match trouvé pour cet utilisateur");
          navigate('/messages');
          return;
        }
        
        // Create conversation for this match
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
          console.log("✅ Conversation créée:", newConversation);
          
          // Refresh conversations list
          await fetchConversations();
          
          // Navigate to messenger with the new conversation
          navigate(`/messages?conversation=${newConversation.id}`);
        } else {
          const error = await response.json();
          console.error("❌ Échec de création de la conversation:", error);
          navigate('/messages');
        }
      } catch (error) {
        console.error("Erreur lors de la création de la conversation:", error);
        navigate('/messages');
      }
    }
  };

  // Navigate to messenger without specific conversation
  const goToMessages = () => {
    navigate('/messages');
  };

  // Navigate to profile
  const goToProfile = (profileId) => {
    navigate(`/profile/${profileId}`);
  };

  // Navigate to own profile
  const goToMyProfile = () => {
    navigate('/profile');
  };

  // Photo modal functions
  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
    setPhotoModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
    document.body.style.overflow = 'unset';
  };

  // Photo Modal Component
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
            background: "rgba(0,0,0,0.95)",
            zIndex: 1000000,
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
            zIndex: 1000001,
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
            <img
              src={selectedPhoto}
              alt="Plein écran"
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
        console.log("✅ Conversations récupérées:", data);
        setConversations(data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des conversations:", error);
    }
  };

  // Fetch authenticated user on mount
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
        console.log("✅ Utilisateur authentifié:", data);
        setUser(data);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
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

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fetch blocked users
  const fetchBlockedUsers = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/blocked/blocks/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        console.error("Token expiré dans fetchBlockedUsers");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Utilisateurs bloqués:", data);
        
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

  // Fetch likes received (people who liked me)
  const fetchLikesReceived = async (currentBlockedIds = blockedIds) => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/likes/received/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        console.error("Token expiré dans fetchLikesReceived");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Likes reçus:", data);
        
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
        
        // Filter out blocked users AFTER getting all likes
        const filteredLikes = likes.filter(like => !currentBlockedIds.includes(like.id));
        setLikesList(filteredLikes);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des likes reçus:", error);
    }
  };

  // Fetch likes sent (people I liked)
  const fetchSentLikes = async () => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/likes/sent/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        console.error("Token expiré dans fetchSentLikes");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Likes envoyés:", data);
        
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
        console.error("Token expiré dans fetchMatches");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Matches récupérés:", data);
        
        const matches = data.map(match => {
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
        
        // Filter out blocked users AFTER getting all matches
        const filteredMatches = matches.filter(match => !currentBlockedIds.includes(match.id));
        setMatchesList(filteredMatches);
        
        const matchedIdsArray = filteredMatches.map(m => m.id);
        setMatchesIds(matchedIdsArray);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des matches:", error);
    }
  };

  // Create match in database
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
        console.log("✅ Match créé/existant:", data);
        return true;
      } else {
        console.error("Échec de la création du match:", data);
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la création du match:", error);
      return false;
    }
  };

  // Delete like from database
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
        console.log("✅ Like supprimé de la base de données:", profileId);
        return true;
      } else {
        console.error("❌ Échec de la suppression du like");
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du like:", error);
      return false;
    }
  };

  // Delete match from database
  const deleteMatch = async (matchId) => {
    if (!matchId) {
      console.error("❌ Aucun ID de match fourni");
      return false;
    }
    
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
        console.log("✅ Match supprimé de la base de données:", matchId);
        return true;
      } else {
        console.error("❌ Échec de la suppression du match");
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du match:", error);
      return false;
    }
  };

  // Unlike a profile - deletes the like AND removes match if exists
  const handleUnlike = async (profileId) => {
    const success = await deleteLike(profileId);
    if (success) {
      setSentLikesIds(prev => prev.filter(id => id !== profileId));
      
      // If there was a match, remove it from matches list too
      if (matchesIds.includes(profileId)) {
        removeFromMatches(profileId);
      }
      
      // Remove from likes list
      setLikesList(prev => prev.filter(like => like.id !== profileId));
    }
    return success;
  };

  // Unmatch a profile - ONLY deletes the match, keeps the like
  const handleUnmatch = async (profile) => {
    if (!profile || !profile.match_id) {
      console.error("❌ Aucun ID de match fourni pour le unmatch");
      return;
    }
    
    const success = await deleteMatch(profile.match_id);
    if (success) {
      // Remove from matches list only - keep the like
      removeFromMatches(profile.id);
      closeMatchModal();
      
      // Refresh conversations after unmatch
      fetchConversations();
    }
  };

  // Check for mutual like and create match
  const checkForMatch = async (likedUserId) => {
    if (isBlocked(likedUserId)) return;
    
    const theyLikeMe = likesList.some(like => like.id === likedUserId);
    
    if (theyLikeMe) {
      console.log("🎉 Like mutuel détecté! Création du match...");
      
      const matchCreated = await createMatch(likedUserId);
      
      if (matchCreated) {
        await fetchMatches(blockedIds);
        await fetchConversations(); // Refresh conversations after match
        const matchedProfile = likesList.find(like => like.id === likedUserId);
        setMatchedProfile(matchedProfile);
        setMatchModalOpen(true);
        document.body.style.overflow = 'hidden';
      }
    }
  };

  // Block a user - deletes likes and matches from database
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
        console.log("✅ Utilisateur bloqué:", data);
        
        // Delete like from database if exists
        if (sentLikesIds.includes(profile.id)) {
          await deleteLike(profile.id);
        }
        
        // Delete match from database if exists
        if (matchesIds.includes(profile.id)) {
          const match = matchesList.find(m => m.id === profile.id);
          if (match && match.match_id) {
            await deleteMatch(match.match_id);
          }
        }
        
        // Update blocked IDs first
        const newBlockedIds = [...blockedIds, profile.id];
        setBlockedIds(newBlockedIds);
        
        // Add to blocked list
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
        
        // Remove from all lists in UI
        removeFromMatches(profile.id);
        removeFromLikes(profile.id);
        removeFromDiscover(profile.id);
        
        // Close any open modals
        if (likeModalOpen) closeLikeModal();
        if (matchModalOpen) closeMatchModal();
        
        // Refresh conversations
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
        console.log("✅ Utilisateur débloqué:", profile.id);
        
        // Update blocked IDs first
        const newBlockedIds = blockedIds.filter(id => id !== profile.id);
        setBlockedIds(newBlockedIds);
        
        // Remove from blocked list
        setBlockedList(prev => prev.filter(b => b.id !== profile.id));
        
        // Close unblock modal
        setUnblockModalOpen(false);
        setSelectedBlocked(null);
        
        // Refresh profiles with new blocked IDs
        if (user) {
          fetchProfilesBasedOnUser(newBlockedIds);
          // Refresh likes and matches with new blocked IDs
          fetchLikesReceived(newBlockedIds);
          fetchMatches(newBlockedIds);
          fetchConversations(); // Refresh conversations
        }
        
      } else {
        console.error("❌ Échec du déblocage");
      }
    } catch (error) {
      console.error("Erreur lors du déblocage de l'utilisateur:", error);
    }
  };

  // Fetch profiles from database
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
        console.log("🔍 Récupération des profils masculins");
      } else if (user.interested_in === 'female') {
        genderFilter = 'female';
        console.log("🔍 Récupération des profils féminins");
      } else if (user.interested_in === 'everyone') {
        console.log("🔍 Récupération de tous les profils");
      }

      const queryParams = new URLSearchParams();
      if (genderFilter) {
        queryParams.append('gender', genderFilter);
      }
      
      const apiUrl = `http://127.0.0.1:8000/api/users/profiles/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log("🔍 Récupération des profils depuis:", apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        console.error("Token expiré dans fetchProfiles");
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

      console.log(`📊 Nombre de profils bruts: ${profilesArray.length}`);

      // Filter out current user and blocked users
      const filteredById = profilesArray.filter(profile => 
        profile.id !== user.id && !currentBlockedIds.includes(profile.id)
      );
      console.log(`📊 Après suppression de l'utilisateur actuel et des bloqués: ${filteredById.length}`);

      // Apply gender filter if needed
      let genderFilteredProfiles = filteredById;
      if (genderFilter) {
        genderFilteredProfiles = filteredById.filter(profile => profile.gender === genderFilter);
        console.log(`📊 Après filtre de genre: ${genderFilteredProfiles.length} profils`);
      }

      // Transform profiles
      const transformedProfiles = genderFilteredProfiles.map(profile => ({
        id: profile.id,
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        age: profile.age || calculateAge(profile.birth_date),
        bio: profile.bio || "",
        photo: getProfilePhotoUrl(profile.profile_photo),
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
        fetchConversations() // Fetch conversations
      ]);
    };
    
    fetchAllInteractions();
  }, [user]);

  const currentProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    if (profileIndex >= profiles.length) return null;
    
    if (user && profiles[profileIndex] && profiles[profileIndex].id === user.id) {
      console.log(`🚨 Urgence: Utilisateur actuel trouvé dans les profils! Ignoré...`);
      setTimeout(() => goNextProfile(), 0);
      return null;
    }
    
    return profiles[profileIndex];
  }, [profiles, profileIndex, user]);

  const goNextProfile = () => {
    if (profileIndex < profiles.length - 1) {
      setProfileIndex((prev) => prev + 1);
    } else {
      setProfileIndex(profiles.length);
    }
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

  const handlePass = () => triggerSlide("left");
  
  const handleLike = async () => {
    if (!currentProfile || isAnimating || isBlocked(currentProfile.id)) return;
    
    try {
      const token = localStorage.getItem("access");
      const response = await fetch("http://127.0.0.1:8000/api/interactions/like/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          to_user_id: currentProfile.id 
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
        console.log("✅ Like envoyé avec succès:", data);
        
        setSentLikesIds(prev => [...prev, currentProfile.id]);
        await checkForMatch(currentProfile.id);
        
      } else {
        const error = await response.json();
        console.error("❌ Échec du like:", error);
      }
    } catch (error) {
      console.error("Erreur lors du like du profil:", error);
    }

    triggerSlide("right");
  };

  const openLikeModal = (p) => {
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
        console.log("✅ Like retourné avec succès");
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

  const ModalShell = ({ open, onClose, title, children, maxWidth = 520, overlay = "rgba(0,0,0,0.60)" }) => {
    if (!open) return null;

    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            background: overlay,
            zIndex: 999999,
            backdropFilter: "blur(4px)",
            margin: 0,
            padding: 0,
          }}
        />

        <div
          role="dialog"
          aria-modal="true"
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
            margin: 0,
            padding: "16px",
            pointerEvents: "none",
          }}
        >
          <div
            className="card shadow-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth,
              borderRadius: 28,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "#ffffff",
              animation: "modalFadeIn 0.2s ease-out",
              pointerEvents: "auto",
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              margin: 0,
            }}
          >
            <div className="p-4 d-flex align-items-center justify-content-between border-bottom">
              <div className="fw-bold fs-5">{title}</div>

              <button
                className="btn rounded-circle d-flex align-items-center justify-content-center"
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  width: 40,
                  height: 40,
                  background: "rgba(0,0,0,0.04)",
                  border: "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
              >
                <i className="fas fa-times" style={{ color: "#111", fontSize: "1.1rem" }} />
              </button>
            </div>

            <div className="p-4">{children}</div>
          </div>
        </div>
      </>
    );
  };

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

  const RoundActionBtn = ({ onClick, bg, border, icon, iconColor, label }) => (
    <button
      type="button"
      className="btn rounded-circle shadow-sm d-flex align-items-center justify-content-center round-action-btn position-relative"
      onClick={onClick}
      style={{
        width: 64,
        height: 64,
        background: bg,
        border: border || "none",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      }}
      aria-label={label}
    >
      <i className={icon} style={{ color: iconColor, fontSize: "1.3rem" }} />
      <span className="round-tooltip">{label}</span>
    </button>
  );

  return (
    <>
      <DashboardNavbar user={user} />
      <PhotoModal />

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          html, body {
            height: 100%;
            overflow: hidden;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f5f7fb;
            margin: 0;
            padding: 0;
          }
          
          .dashboard-container {
            height: calc(100vh - 72px);
            overflow: hidden;
            background: #f5f7fb;
          }
          
          .dashboard-row {
            height: 100%;
            overflow: hidden;
            margin: 0 -8px;
          }
          
          .dashboard-col {
            height: 100%;
            overflow: hidden;
            padding: 0 8px;
          }
          
          .scrollable-card {
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            border-radius: 24px !important;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          }
          
          .scrollable-card::-webkit-scrollbar {
            width: 6px;
          }
          
          .scrollable-card::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }
          
          .scrollable-card::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 10px;
          }
          
          .scrollable-card::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          
          .center-col {
            height: 100%;
            overflow: hidden;
          }
          
          .center-card {
            height: 100%;
            display: flex;
            flex-direction: column;
            border-radius: 24px !important;
            overflow: hidden !important;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          
          .image-container {
            background-color: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            min-height: 0;
            flex: 1 1 auto;
            width: 100%;
            cursor: pointer;
            position: relative;
          }

          .image-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .image-container::after {
            content: '🔍';
            position: absolute;
            bottom: 16px;
            right: 16px;
            background: rgba(255,255,255,0.9);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            opacity: 0;
            transition: opacity 0.2s;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            pointer-events: none;
          }

          .image-container:hover::after {
            opacity: 1;
          }

          .card-content {
            flex: 0 0 auto;
            padding: 1.5rem;
            background: #ffffff;
            border-top: 1px solid #f0f0f0;
          }
          
          .round-action-btn .round-tooltip{
            position: absolute;
            left: 50%;
            bottom: calc(100% + 12px);
            transform: translateX(-50%) translateY(6px);
            background: #1a1a1a;
            color: #fff;
            font-size: 12px;
            font-weight: 500;
            padding: 6px 12px;
            border-radius: 20px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 160ms ease, transform 160ms ease;
            box-shadow: 0 10px 22px rgba(0,0,0,0.25);
            z-index: 5;
          }
          .round-action-btn .round-tooltip::after{
            content: "";
            position: absolute;
            left: 50%;
            top: 100%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid #1a1a1a;
          }
          .round-action-btn:hover .round-tooltip{
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }

          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @keyframes modalFadeIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          .profile-card {
            transition: all 0.3s ease;
          }
          
          .profile-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 30px rgba(0,0,0,0.1) !important;
          }

          .text-truncate-custom {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          }

          .modal-image-container {
            background-color: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            min-height: 360px;
            border-radius: 16px;
          }

          .modal-image-container img {
            max-width: 100%;
            max-height: 360px;
            width: auto;
            height: auto;
            object-fit: contain;
            margin: 0 auto;
            display: block;
          }

          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-left: 10px;
          }
          
          .liked-badge {
            background: #ff4d6d;
            color: white;
          }
          
          .matched-badge {
            background: #ff4d6d;
            color: white;
          }

          .clickable-profile {
            cursor: pointer;
            transition: opacity 0.2s;
          }
          
          .clickable-profile:hover {
            opacity: 0.8;
          }

          /* Responsive adjustments */
          @media (max-width: 768px) {
            .dashboard-container {
              height: auto;
              overflow: auto;
            }
            
            html, body {
              overflow: auto;
            }
            
            .image-container {
              min-height: 300px;
            }
          }
        `}
      </style>

      <div className="dashboard-container container">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "100%" }}>
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : user ? (
          <div className="container-fluid h-100 py-3">
            <div className="row g-3 h-100 dashboard-row">
              {/* LEFT BLOCK - Profil utilisateur et listes */}
              <div className="col-lg-3 col-md-4 order-2 order-md-1 h-100 dashboard-col">
                <div className="scrollable-card p-3">
                  {/* Profil utilisateur cliquable */}
                  <div className="d-flex align-items-center gap-3 clickable-profile" onClick={goToMyProfile}>
                    <div className="position-relative flex-shrink-0">
                      <img
                        src={getProfilePhotoUrl(user.profile_photo) || "https://via.placeholder.com/70"}
                        alt="profil"
                        className="rounded-circle shadow-sm"
                        width="70"
                        height="70"
                        style={{ objectFit: "cover", border: "3px solid #fff" }}
                      />
                      <div className="position-absolute bottom-0 end-0 bg-success rounded-circle p-2" style={{ width: 14, height: 14, border: "2px solid #fff" }} />
                    </div>
                    <div className="text-start flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-bold fs-5 text-truncate-custom">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}` 
                          : user.first_name || user.last_name || ""}
                      </div>
                      <div className="small text-secondary text-truncate-custom" title={user.email}>{user.email}</div>
                    </div>
                  </div>

                  <div className="mt-3" style={{ height: 1, background: "linear-gradient(90deg, transparent, #e9ecef, transparent)" }} />

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

              {/* CENTER BLOCK - Carte de swipe principale */}
              <div className="col-lg-6 col-md-8 order-1 order-md-2 h-100 dashboard-col center-col">
                <div className="center-card" style={centerCardStyle}>
                  {profilesLoading ? (
                    <div className="h-100 d-flex align-items-center justify-content-center">
                      <div className="text-center">
                        <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }} />
                        <div className="text-secondary">Chargement des profils...</div>
                      </div>
                    </div>
                  ) : apiError ? (
                    <div className="h-100 d-flex align-items-center justify-content-center">
                      <div className="text-center p-4">
                        <div className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10" style={{ width: 80, height: 80 }}>
                          <i className="fas fa-exclamation-triangle text-danger" style={{ fontSize: "2rem" }} />
                        </div>
                        <h5 className="fw-bold mb-2">Erreur de chargement</h5>
                        <p className="text-secondary mb-3">{apiError}</p>
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => window.location.reload()}
                        >
                          Réessayer
                        </button>
                      </div>
                    </div>
                  ) : profiles.length > 0 && profileIndex < profiles.length ? (
                    <>
                      {/* Image du profil cliquable - Ouvre en plein écran */}
                      <div className="image-container" onClick={() => openPhotoModal(currentProfile.photo)}>
                        {currentProfile.photo ? (
                          <img
                            src={currentProfile.photo}
                            alt={formatName(currentProfile) || "Profil"}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML += '<div class="p-5 text-secondary">Photo non disponible</div>';
                            }}
                          />
                        ) : (
                          <div className="p-5 text-secondary">Photo non disponible</div>
                        )}
                      </div>

                      <div className="card-content">
                        <div className="d-flex align-items-center mb-2">
                          {/* Nom cliquable - Va vers le profil */}
                          <h2 className="fw-bold mb-0 clickable-profile" onClick={() => goToProfile(currentProfile.id)}>
                            {formatName(currentProfile)}
                            {formatName(currentProfile) && currentProfile.age ? `, ${currentProfile.age}` : currentProfile.age || ''}
                          </h2>
                          {isMatched(currentProfile.id) && (
                            <span className="status-badge matched-badge">Match</span>
                          )}
                          {!isMatched(currentProfile.id) && isLiked(currentProfile.id) && (
                            <span className="status-badge liked-badge">Aimé</span>
                          )}
                        </div>
                        <p className="text-secondary mb-3" style={{ fontSize: "1rem", lineHeight: 1.5 }}>{currentProfile.bio || "Pas encore de bio"}</p>

                        {isMatched(currentProfile.id) ? (
                          <div className="d-flex justify-content-center gap-2 flex-wrap mt-3">
                            <button
                              onClick={handlePass}
                              disabled={isAnimating}
                              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
                              style={{
                                width: "60px",
                                height: "60px",
                                background: "#ffffff",
                                border: "1px solid #e9ecef",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f8f9fa";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#ffffff";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              aria-label="Passer"
                            >
                              <i className="fas fa-times" style={{ color: "#adb5bd", fontSize: "1.3rem" }} />
                            </button>

                            <RoundActionBtn
                              onClick={() => goToProfile(currentProfile.id)}
                              bg="#ffffff"
                              border="1px solid #e9ecef"
                              icon="fas fa-user"
                              iconColor="#6f42c1"
                              label="Voir le profil"
                            />

                            <RoundActionBtn
                              onClick={() => goToMessenger(currentProfile.id)}
                              bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
                              border="none"
                              icon="fas fa-comment-dots"
                              iconColor="#ffffff"
                              label="Envoyer un message"
                            />

                            <RoundActionBtn
                              onClick={() => {
                                setMatchedProfile(currentProfile);
                                setMatchModalOpen(true);
                              }}
                              bg="#ffffff"
                              border="1px solid #dc354530"
                              icon="fas fa-heart-broken"
                              iconColor="#dc3545"
                              label="Annuler le match"
                            />

                            <RoundActionBtn
                              onClick={() => handleBlock(currentProfile)}
                              bg="#1a1a1a"
                              border="none"
                              icon="fas fa-ban"
                              iconColor="#ffffff"
                              label="Bloquer"
                            />
                          </div>
                        ) : (
                          <div className="d-flex justify-content-center gap-3 mt-3">
                            <button
                              onClick={handlePass}
                              disabled={isAnimating}
                              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
                              style={{
                                width: "60px",
                                height: "60px",
                                background: "#ffffff",
                                border: "1px solid #e9ecef",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f8f9fa";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#ffffff";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              aria-label="Passer"
                            >
                              <i className="fas fa-times" style={{ color: "#adb5bd", fontSize: "1.3rem" }} />
                            </button>

                            <button
                              onClick={handleLike}
                              disabled={isAnimating}
                              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
                              style={{
                                width: "74px",
                                height: "74px",
                                background: "linear-gradient(145deg, #ff4d6d, #ff3355)",
                                border: "none",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.08)";
                                e.currentTarget.style.boxShadow = "0 10px 25px rgba(255,77,109,0.4)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.boxShadow = "0 8px 20px rgba(255,77,109,0.3)";
                              }}
                              aria-label="Aimer"
                            >
                              <i className="fas fa-heart" style={{ color: "#ffffff", fontSize: "1.6rem" }} />
                            </button>

                            <button
                              onClick={() => goToProfile(currentProfile.id)}
                              disabled={isAnimating}
                              className="btn rounded-circle shadow d-flex align-items-center justify-content-center"
                              style={{
                                width: "60px",
                                height: "60px",
                                background: "#ffffff",
                                border: "1px solid #e9ecef",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f8f9fa";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#ffffff";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                              aria-label="Voir le profil"
                            >
                              <i className="fas fa-user" style={{ color: "#6f42c1", fontSize: "1.2rem" }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-100 d-flex align-items-center justify-content-center">
                      <div className="text-center p-4">
                        <div
                          className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle"
                          style={{ width: 100, height: 100, background: "rgba(255,77,109,0.1)" }}
                        >
                          <i className="fas fa-heart" style={{ color: "#ff4d6d", fontSize: "2.5rem" }} />
                        </div>

                        <h4 className="fw-bold mb-2">Plus de profils</h4>
                        <p className="text-secondary mb-4">Revenez plus tard pour découvrir de nouvelles personnes !</p>

                        <button
                          className="btn btn-primary rounded-pill px-5 py-2"
                          onClick={() => {
                            window.location.reload();
                          }}
                          style={{ background: "#ff4d6d", border: "none" }}
                        >
                          Rafraîchir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT BLOCK - Détails du profil actuel */}
              <div className="col-lg-3 d-none d-lg-block order-3 h-100 dashboard-col">
                <div className="scrollable-card p-3">
                  {currentProfile ? (
                    <>
                      {/* Résumé du profil cliquable */}
                      <div className="d-flex align-items-center gap-3 mb-3 clickable-profile" onClick={() => goToProfile(currentProfile.id)}>
                        <img
                          src={currentProfile.photo || "https://via.placeholder.com/60"}
                          alt={formatName(currentProfile) || "Profil"}
                          className="rounded-circle shadow-sm"
                          width="60"
                          height="60"
                          style={{ objectFit: "cover", border: "3px solid #fff" }}
                        />
                        <div>
                          <div className="d-flex align-items-center">
                            <h5 className="fw-bold mb-1">
                              {formatName(currentProfile)}
                              {formatName(currentProfile) && currentProfile.age ? `, ${currentProfile.age}` : currentProfile.age || ''}
                            </h5>
                            {isMatched(currentProfile.id) && (
                              <span className="status-badge matched-badge" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>Match</span>
                            )}
                            {!isMatched(currentProfile.id) && isLiked(currentProfile.id) && (
                              <span className="status-badge liked-badge" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>Aimé</span>
                            )}
                          </div>
                          <div className="small text-secondary">
                            <i className="fas fa-map-marker-alt me-1" style={{ fontSize: "0.8rem" }} />
                            {currentProfile.location || "Localisation non spécifiée"}
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <h6 className="fw-semibold mb-2" style={{ color: "#495057", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                          <i className="fas fa-info-circle me-2" />INFOS DE BASE
                        </h6>
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-venus-mars text-secondary flex-shrink-0" style={{ width: 20 }} />
                            <span className="text-secondary small text-truncate-custom">
                              {currentProfile.gender ? currentProfile.gender.charAt(0).toUpperCase() + currentProfile.gender.slice(1) : "Non spécifié"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-heart text-secondary flex-shrink-0" style={{ width: 20 }} />
                            <span className="text-secondary small text-truncate-custom">
                              Intéressé par: {currentProfile.interested_in ? 
                                (currentProfile.interested_in === 'male' ? 'Hommes' : 
                                 currentProfile.interested_in === 'female' ? 'Femmes' : 'Tout le monde') 
                                : "Non spécifié"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-cake-candles text-secondary flex-shrink-0" style={{ width: 20 }} />
                            <span className="text-secondary small text-truncate-custom">
                              {currentProfile.birth_date ? calculateAge(currentProfile.birth_date) + " ans" : "Âge non spécifié"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-ruler text-secondary flex-shrink-0" style={{ width: 20 }} />
                            <span className="text-secondary small text-truncate-custom">
                              {currentProfile.height ? `${currentProfile.height} cm` : "Taille non spécifiée"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <h6 className="fw-semibold mb-2" style={{ color: "#495057", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                          <i className="fas fa-briefcase me-2" />PROFESSION
                        </h6>
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-briefcase text-secondary flex-shrink-0" style={{ width: 20 }} />
                            <span className="text-secondary small text-truncate-custom">{currentProfile.career || "Non spécifiée"}</span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-graduation-cap text-secondary flex-shrink-0" style={{ width: 20 }} />
                            <span className="text-secondary small text-truncate-custom">{currentProfile.education || "Non spécifiée"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <h6 className="fw-semibold mb-2" style={{ color: "#495057", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                          <i className="fas fa-heart me-2" />PASSIONS & LOISIRS
                        </h6>
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-fire text-secondary flex-shrink-0" style={{ width: 20 }} />
                            <span className="text-secondary small text-truncate-custom" title={currentProfile.passions}>
                              {currentProfile.passions || "Non spécifiées"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <i className="fas fa-pencil text-secondary flex-shrink-0" style={{ width: 20 }} />
                            <span className="text-secondary small text-truncate-custom" title={currentProfile.hobbies}>
                              {currentProfile.hobbies || "Non spécifiés"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <h6 className="fw-semibold mb-2" style={{ color: "#495057", fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                          <i className="fas fa-music me-2" />MUSIQUE
                        </h6>
                        <div className="d-flex align-items-center gap-2">
                          <i className="fas fa-headphones text-secondary flex-shrink-0" style={{ width: 20 }} />
                          <span className="text-secondary small text-truncate-custom" title={currentProfile.favorite_music}>
                            {currentProfile.favorite_music || "Non spécifiée"}
                          </span>
                        </div>
                      </div>
                      
                      
                      
                      {/* Bouton Message pour les utilisateurs matchés dans la barre latérale */}
                      {isMatched(currentProfile.id) && (
                        <div className="mt-2 text-center">
                          <button
                            onClick={() => goToMessenger(currentProfile.id)}
                            className="btn w-100 py-2"
                            style={{ 
                              borderRadius: "30px", 
                              background: "linear-gradient(145deg, #6f42c1, #5a32a3)",
                              color: "white",
                              border: "none",
                              fontSize: "0.9rem"
                            }}
                          >
                            <i className="fas fa-comment-dots me-2"></i>
                            Envoyer un message
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-light" style={{ width: 60, height: 60 }}>
                        <i className="fas fa-user-slash text-secondary" style={{ fontSize: "1.5rem" }} />
                      </div>
                      <p className="text-secondary small">Aucun profil sélectionné</p>
                    </div>
                  )}
                </div>
              </div>

              {/* MODAL DES LIKES */}
              <ModalShell
                open={likeModalOpen}
                onClose={closeLikeModal}
                title=""
                overlay="rgba(0,0,0,0.60)"
                maxWidth={480}>
                {selectedLike && (
                  <>
                    <div className="modal-image-container mb-3" style={{ minHeight: "300px", maxHeight: "300px" }}>
                      {selectedLike.photo ? (
                        <img 
                          src={selectedLike.photo} 
                          alt={selectedLike.first_name + " " + selectedLike.last_name || "Profil"}
                          onClick={() => {
                            closeLikeModal();
                            setTimeout(() => openPhotoModal(selectedLike.photo), 100);
                          }}
                          style={{ cursor: "pointer" }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML += '<div class="p-5 text-secondary">Photo non disponible</div>';
                          }}
                        />
                      ) : (
                        <div className="p-5 text-secondary">Photo non disponible</div>
                      )}
                    </div>

                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h4 className="fw-bold mb-0 clickable-profile" onClick={() => {
                        closeLikeModal();
                        goToProfile(selectedLike.id);
                      }}>
                        {selectedLike.first_name} {selectedLike.last_name}
                        {selectedLike.age ? `, ${selectedLike.age}` : ''}
                      </h4>
                      {isMatched(selectedLike.id) && (
                        <span className="status-badge matched-badge">Match</span>
                      )}
                    </div>

                    <p className="text-secondary mb-3" style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{selectedLike.bio || "Pas encore de bio"}</p>

                    {isMatched(selectedLike.id) ? (
                      <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <RoundActionBtn
                          onClick={() => {
                            closeLikeModal();
                            goToProfile(selectedLike.id);
                          }}
                          bg="#ffffff"
                          border="1px solid #e9ecef"
                          icon="fas fa-user"
                          iconColor="#6f42c1"
                          label="Voir le profil"
                        />
                        <RoundActionBtn
                          onClick={() => {
                            closeLikeModal();
                            goToMessenger(selectedLike.id);
                          }}
                          bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
                          border="none"
                          icon="fas fa-comment-dots"
                          iconColor="#ffffff"
                          label="Envoyer un message"
                        />
                        {/* SINGLE UNLIKE BUTTON - deletes like AND match */}
                        <RoundActionBtn
                          onClick={() => handleUnlikeFromModal()}
                          bg="#dc3545"
                          border="none"
                          icon="fas fa-heart-broken"
                          iconColor="#ffffff"
                          label="Unlike"
                        />
                        <RoundActionBtn
                          onClick={() => {
                            handleBlock(selectedLike);
                            closeLikeModal();
                          }}
                          bg="#1a1a1a"
                          border="none"
                          icon="fas fa-ban"
                          iconColor="#ffffff"
                          label="Bloquer"
                        />
                      </div>
                    ) : (
                      <div className="d-flex justify-content-center gap-2">
                        <RoundActionBtn
                          onClick={handlePassFromLikeModal}
                          bg="#ffffff"
                          border="1px solid #e9ecef"
                          icon="fas fa-times"
                          iconColor="#adb5bd"
                          label="Passer"
                        />
                        <RoundActionBtn
                          onClick={handleLikeBack}
                          bg="linear-gradient(145deg, #ff4d6d, #ff3355)"
                          border="none"
                          icon="fas fa-heart"
                          iconColor="#ffffff"
                          label="Aimer en retour"
                        />
                        <RoundActionBtn
                          onClick={() => {
                            closeLikeModal();
                            goToProfile(selectedLike.id);
                          }}
                          bg="#ffffff"
                          border="1px solid #e9ecef"
                          icon="fas fa-user"
                          iconColor="#6f42c1"
                          label="Voir le profil"
                        />
                        <RoundActionBtn
                          onClick={() => {
                            handleBlock(selectedLike);
                            closeLikeModal();
                          }}
                          bg="#1a1a1a"
                          border="none"
                          icon="fas fa-ban"
                          iconColor="#ffffff"
                          label="Bloquer"
                        />
                      </div>
                    )}
                  </>
                )}
              </ModalShell>

              {/* MODAL DE MATCH */}
              <ModalShell
                open={matchModalOpen}
                onClose={closeMatchModal}
                title=""
                maxWidth={640}
                overlay="rgba(0,0,0,0.60)">
                {matchedProfile && (
                  <>
                    <div
                      className="text-center p-4 position-relative rounded-4 mb-4"
                      style={{
                        background: "linear-gradient(145deg, #fff5f7, #fff)",
                      }}
                    >
                      <h2 className="fw-bold mb-2" style={{ fontSize: "2.5rem", background: "linear-gradient(145deg, #ff4d6d, #ff3355)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        🎉Nou Match!🎉
                      </h2>

                      <p className="text-secondary mb-4">
                        Vous et <span className="fw-semibold text-dark clickable-profile" onClick={() => {
                          closeMatchModal();
                          goToProfile(matchedProfile.id);
                        }}>{matchedProfile.first_name} {matchedProfile.last_name}</span> vous êtes mutuellement likés, démarrer une conversation n'a jamais été aussi simple !
                      </p>

                      <div className="d-flex align-items-center justify-content-center gap-4 mb-4">
                        <div style={{ width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => {
                          closeMatchModal();
                          setTimeout(() => openPhotoModal(matchedProfile.photo), 100);
                        }}>
                          <img 
                            src={matchedProfile.photo || "https://via.placeholder.com/100"} 
                            alt={matchedProfile.first_name + " " + matchedProfile.last_name || "Profil"}
                            style={{ 
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        </div>
                        <div className="text-start" style={{ minWidth: 0 }}>
                          <h4 className="fw-bold mb-1 text-truncate-custom clickable-profile" onClick={() => {
                            closeMatchModal();
                            goToProfile(matchedProfile.id);
                          }}>
                            {matchedProfile.first_name} {matchedProfile.last_name}
                            {matchedProfile.age ? `, ${matchedProfile.age}` : ''}
                          </h4>
                          <p className="text-secondary mb-0 text-truncate-custom" style={{ maxWidth: 300 }} title={matchedProfile.bio}>{matchedProfile.bio || "Pas encore de bio"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-center gap-3 flex-wrap">
                      <RoundActionBtn
                        onClick={() => {
                          closeMatchModal();
                          goToProfile(matchedProfile.id);
                        }}
                        bg="#ffffff"
                        border="1px solid #e9ecef"
                        icon="fas fa-user"
                        iconColor="#6f42c1"
                        label="Voir le profil"
                      />

                      <RoundActionBtn
                        onClick={() => {
                          closeMatchModal();
                          goToMessenger(matchedProfile.id);
                        }}
                        bg="linear-gradient(145deg, #6f42c1, #5a32a3)"
                        border="none"
                        icon="fas fa-comment-dots"
                        iconColor="#ffffff"
                        label="Envoyer un message"
                      />

                      <RoundActionBtn
                        onClick={() => handleUnmatch(matchedProfile)}
                        bg="#ffffff"
                        border="1px solid #dc354530"
                        icon="fas fa-heart-broken"
                        iconColor="#dc3545"
                        label="Annuler le match"
                      />

                      <RoundActionBtn
                        onClick={() => handleBlock(matchedProfile)}
                        bg="#1a1a1a"
                        border="none"
                        icon="fas fa-ban"
                        iconColor="#ffffff"
                        label="Bloquer"
                      />
                    </div>

                    <p className="text-center text-secondary small mt-3 mb-0">
                      Que souhaitez-vous faire ensuite ?
                    </p>
                  </>
                )}
              </ModalShell>

              {/* MODAL DE DÉBLOCAGE */}
              <ModalShell
                open={unblockModalOpen}
                onClose={closeUnblockModal}
                title=""
                maxWidth={480}
                overlay="rgba(0,0,0,0.60)">
                {selectedBlocked && (
                  <>
                    <div className="modal-image-container mb-3" style={{ minHeight: "200px", maxHeight: "200px" }}>
                      {selectedBlocked.photo ? (
                        <img 
                          src={selectedBlocked.photo} 
                          alt={selectedBlocked.first_name + " " + selectedBlocked.last_name || "Profil"}
                          onClick={() => {
                            closeUnblockModal();
                            setTimeout(() => openPhotoModal(selectedBlocked.photo), 100);
                          }}
                          style={{ cursor: "pointer" }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML += '<div class="p-5 text-secondary">Photo non disponible</div>';
                          }}
                        />
                      ) : (
                        <div className="p-5 text-secondary">Photo non disponible</div>
                      )}
                    </div>

                    <div className="text-center mb-4">
                      <h4 className="fw-bold mb-2 clickable-profile" onClick={() => {
                        closeUnblockModal();
                        goToProfile(selectedBlocked.id);
                      }}>
                        {selectedBlocked.first_name} {selectedBlocked.last_name}
                        {selectedBlocked.age ? `, ${selectedBlocked.age}` : ''}
                      </h4>
                      <p className="text-secondary mb-3">{selectedBlocked.bio || "Pas encore de bio"}</p>
                      <p className="text-muted small">Cet utilisateur est actuellement bloqué</p>
                    </div>

                    <div className="d-flex justify-content-center gap-3">
                      <RoundActionBtn
                        onClick={() => handleUnblock(selectedBlocked)}
                        bg="#28a745"
                        border="none"
                        icon="fas fa-check"
                        iconColor="#ffffff"
                        label="Débloquer"
                      />
                      <RoundActionBtn
                        onClick={closeUnblockModal}
                        bg="#6c757d"
                        border="none"
                        icon="fas fa-times"
                        iconColor="#ffffff"
                        label="Annuler"
                      />
                    </div>
                  </>
                )}
              </ModalShell>

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

