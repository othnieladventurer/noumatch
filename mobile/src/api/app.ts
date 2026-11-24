import { API_BASE_URL, request } from "./client";

/**
 * Endpoints used by the web dashboard (frontend/src/pages/Dashboard.jsx), re-exposed
 * for the native app so the two clients talk to the same API shapes.
 */

export type UserProfile = {
  id: number;
  first_name?: string;
  last_name?: string;
  age?: number | null;
  bio?: string;
  city?: string;
  country?: string;
  location?: string;
  gender?: string;
  email?: string;
  account_type?: string;
  is_online?: boolean;
  is_verified?: boolean;
  height?: number | null;
  passions?: string;
  career?: string;
  education?: string;
  hobbies?: string;
  favorite_music?: string;
  profile_photo?: string | null;
  profile_photo_url?: string | null;
  birth_date?: string;
  date_joined?: string;
  is_staff?: boolean;
  profile_prompts?: { question: string; answer: string }[];
};

export type MatchRecord = {
  id: number;
  user1: UserProfile;
  user2: UserProfile;
};

export type Conversation = {
  id: number;
  other_user?: UserProfile | null;
  last_message?: { content?: string; created_at?: string; is_from_me?: boolean } | null;
  unread_count?: number;
  match_id?: number | null;
};

// Media paths come back relative in places, so resolve them against the API origin.
const ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function displayName(profile?: UserProfile | null): string {
  if (!profile) return "Utilisateur";
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return name || "Utilisateur";
}

export function profilePhoto(profile?: UserProfile | null): string | null {
  return mediaUrl(profile?.profile_photo_url ?? profile?.profile_photo ?? null);
}

type ProfilesPayload = {
  results?: UserProfile[] | { profiles?: UserProfile[] };
  profiles?: UserProfile[];
  next?: string | null;
};

/** GET /users/profiles/ — the discovery feed, with the pagination flag the grid needs. */
export async function fetchProfilesPage(
  page = 1,
): Promise<{ profiles: UserProfile[]; hasNext: boolean }> {
  const data = await request<ProfilesPayload>(`/users/profiles/?page=${page}`);

  let profiles: UserProfile[] = [];
  if (Array.isArray(data?.results)) profiles = data.results;
  else if (data?.results && Array.isArray(data.results.profiles)) profiles = data.results.profiles;
  else if (Array.isArray(data?.profiles)) profiles = data.profiles;
  else if (Array.isArray(data)) profiles = data as UserProfile[];

  return { profiles, hasNext: Boolean(data?.next) };
}

export async function fetchProfiles(page = 1): Promise<UserProfile[]> {
  return (await fetchProfilesPage(page)).profiles;
}

/** POST /interactions/like/ (+ the swipe variant, exactly like the web dashboard). */
export async function likeProfile(userId: number): Promise<void> {
  await request("/interactions/like/", { method: "POST", body: { to_user_id: userId } });
  // The web fires this second call fire-and-forget; a failure here must not block the like.
  try {
    await request("/interactions/swipe/like/", { method: "POST", body: { to_user_id: userId } });
  } catch {
    // ignored by design
  }
}

export type ChatMessage = {
  id: number;
  content?: string;
  created_at: string;
  is_from_me?: boolean;
  read?: boolean;
  message_type?: string;
  attachment_url?: string;
};

/** GET /users/profiles/{id}/ */
export async function fetchProfileById(id: number | string): Promise<UserProfile> {
  return request<UserProfile>(`/users/profiles/${id}/`);
}

/** POST /interactions/pass/ — used by ProfileDetail's Passer button. */
export async function passProfile(id: number): Promise<void> {
  await request("/interactions/pass/", { method: "POST", body: { to_user_id: id } });
}

/** POST /blocked/blocks/ */
export async function blockProfile(id: number): Promise<void> {
  await request("/blocked/blocks/", { method: "POST", body: { blocked: id } });
}

/** POST /chat/conversations/{id}/mark-read/ — clears that thread's unread badge. */
export async function markConversationRead(id: number): Promise<void> {
  await request(`/chat/conversations/${id}/mark-read/`, { method: "POST" });
}

/** GET /chat/conversations/{id}/ — includes the message list. */
export async function fetchConversationMessages(id: number): Promise<ChatMessage[]> {
  const data = await request<{ messages?: ChatMessage[] }>(`/chat/conversations/${id}/`);
  return Array.isArray(data?.messages) ? data.messages : [];
}

/** POST /chat/conversations/{id}/send/ (multipart, as the web does). */
export async function sendChatMessage(id: number, content: string): Promise<ChatMessage> {
  const form = new FormData();
  form.append("content", content);
  return request<ChatMessage>(`/chat/conversations/${id}/send/`, { method: "POST", body: form });
}

/** PATCH /users/profile/update/ — JSON fields (profile prompts). */
export async function updateMyProfile(fields: Record<string, unknown>): Promise<void> {
  await request("/users/profile/update/", { method: "PATCH", body: fields });
}

/** PUT /users/profile/update/ — multipart, exactly what Profile.jsx sends on save. */
export async function updateMyProfileForm(
  fields: Record<string, string | number | null | undefined>,
  photo?: { uri: string; name?: string; type?: string },
): Promise<UserProfile> {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === "bio") form.append(key, String(value));
    else if (String(value) !== "") form.append(key, String(value));
  });
  if (photo) {
    form.append("profile_photo", {
      uri: photo.uri,
      name: photo.name ?? "profile.jpg",
      type: photo.type ?? "image/jpeg",
    } as unknown as Blob);
  }
  return request<UserProfile>("/users/profile/update/", { method: "PUT", body: form });
}

/** PATCH /users/profile/update/ with the prompt list. */
export async function saveProfilePrompts(
  prompts: { question: string; answer: string }[],
): Promise<void> {
  await request("/users/profile/update/", { method: "PATCH", body: { profile_prompts: prompts } });
}

export type ProfilePhoto = {
  id: number;
  image?: string | null;
  image_url?: string | null;
  uploaded_at?: string;
};

/** GET /users/{id}/photos/ */
export async function fetchUserPhotos(userId: number | string): Promise<ProfilePhoto[]> {
  const data = await request<ProfilePhoto[]>(`/users/${userId}/photos/`);
  if (!Array.isArray(data)) return [];
  return data.map((photo) => ({
    ...photo,
    image: mediaUrl(photo.image_url ?? photo.image),
  }));
}

/** POST /users/photos/upload-multiple/ (field name "images", like the web). */
export async function uploadProfilePhotos(
  files: { uri: string; name?: string; type?: string }[],
): Promise<void> {
  const form = new FormData();
  files.forEach((file, index) => {
    form.append("images", {
      uri: file.uri,
      name: file.name ?? `photo_${index}.jpg`,
      type: file.type ?? "image/jpeg",
    } as unknown as Blob);
  });
  await request("/users/photos/upload-multiple/", { method: "POST", body: form });
}

/** DELETE /users/photos/{id}/delete/ */
export async function deleteProfilePhoto(photoId: number): Promise<void> {
  await request(`/users/photos/${photoId}/delete/`, { method: "DELETE" });
}

/** POST /users/photos/{id}/set-main/ */
export async function setMainPhoto(photoId: number): Promise<UserProfile> {
  return request<UserProfile>(`/users/photos/${photoId}/set-main/`, { method: "POST" });
}

export type Relationship = {
  isLiked: boolean;
  isMatched: boolean;
  isBlocked: boolean;
  matchId: number | null;
  conversationId: number | null;
};

/** The three status lookups ProfileDetail does before rendering its action bar. */
export async function fetchRelationship(profileId: number): Promise<Relationship> {
  const result: Relationship = {
    isLiked: false,
    isMatched: false,
    isBlocked: false,
    matchId: null,
    conversationId: null,
  };

  const [likes, matches, blocks] = await Promise.allSettled([
    request<{ to_user?: { id?: number } }[]>("/interactions/likes/sent/"),
    request<MatchRecord[]>("/matches/matches/"),
    request<{ blocked?: number }[]>("/blocked/blocks/"),
  ]);

  if (likes.status === "fulfilled" && Array.isArray(likes.value)) {
    result.isLiked = likes.value.some((like) => Number(like?.to_user?.id) === profileId);
  }
  if (blocks.status === "fulfilled" && Array.isArray(blocks.value)) {
    result.isBlocked = blocks.value.some((block) => Number(block?.blocked) === profileId);
  }
  if (matches.status === "fulfilled" && Array.isArray(matches.value)) {
    const match = matches.value.find(
      (item) => item.user1?.id === profileId || item.user2?.id === profileId,
    );
    if (match) {
      result.isMatched = true;
      result.matchId = match.id;
      try {
        const conversations = await fetchConversations();
        const conversation = conversations.find(
          (item) => item.other_user?.id === profileId || item.match_id === match.id,
        );
        result.conversationId = conversation?.id ?? null;
      } catch {
        /* no conversation yet */
      }
    }
  }

  return result;
}

/** POST /interactions/like/ with type=coup_de_coeur for the purple button. */
export async function likeWithType(userId: number, type?: "coup_de_coeur"): Promise<void> {
  await request("/interactions/like/", {
    method: "POST",
    body: type ? { to_user_id: userId, type } : { to_user_id: userId },
  });
}

/** DELETE /interactions/unlike/{id}/ */
export async function unlikeProfile(id: number): Promise<void> {
  await request(`/interactions/unlike/${id}/`, { method: "DELETE" });
}

/** DELETE /matches/unmatch/{matchId}/ */
export async function unmatchProfile(matchId: number): Promise<void> {
  await request(`/matches/unmatch/${matchId}/`, { method: "DELETE" });
}

/** DELETE /blocked/blocks/{id}/unblock/ */
export async function unblockProfile(id: number): Promise<void> {
  await request(`/blocked/blocks/${id}/unblock/`, { method: "DELETE" });
}

/** GET /interactions/coeur/limits/ */
export async function fetchCoeurLimits(): Promise<{
  can_use: boolean;
  remaining: number;
  daily_limit: number;
}> {
  try {
    return await request("/interactions/coeur/limits/");
  } catch {
    return { can_use: true, remaining: 3, daily_limit: 3 };
  }
}

/** POST /matches/match/create/ */
export async function createMatch(user1Id: number, user2Id: number): Promise<MatchRecord> {
  return request<MatchRecord>("/matches/match/create/", {
    method: "POST",
    body: { user1_id: user1Id, user2_id: user2Id },
  });
}

/** DELETE /users/delete-account/ */
export async function deleteMyAccount(): Promise<void> {
  await request("/users/delete-account/", { method: "DELETE" });
}

/** POST /reports/create/ — ReportModal's payload (multipart, field names as-is). */
export async function reportUser(
  reportedUserId: number,
  reason: string,
  description = "",
): Promise<void> {
  const form = new FormData();
  form.append("reported_user", String(reportedUserId));
  form.append("reason", reason);
  form.append("description", description);
  await request("/reports/create/", { method: "POST", body: form });
}

/** GET /matches/matches/ — returns the *other* user of each match, newest first. */
export async function fetchMatches(currentUserId?: number): Promise<UserProfile[]> {
  const data = await request<MatchRecord[]>("/matches/matches/");
  if (!Array.isArray(data)) return [];

  return data
    .map((match) => (match.user1?.id === currentUserId ? match.user2 : match.user1))
    .filter((profile): profile is UserProfile => Boolean(profile));
}

/** GET /chat/conversations/ */
export async function fetchConversations(): Promise<Conversation[]> {
  const data = await request<Conversation[]>("/chat/conversations/");
  return Array.isArray(data) ? data : [];
}

/** GET /chat/unread-count/ */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const data = await request<{ total_unread?: number }>("/chat/unread-count/");
    return data?.total_unread ?? 0;
  } catch {
    return 0;
  }
}

export type AppNotification = {
  id: number;
  type: string;
  title?: string;
  message?: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  link?: string | null;
  count?: number;
};

/** GET /notifications/ — same source as the web NotificationContext. */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const data = await request<AppNotification[] | { results?: AppNotification[] }>("/notifications/");
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

/** POST /notifications/mark-read/ with a single id. */
export async function markNotificationRead(id: number): Promise<void> {
  await request("/notifications/mark-read/", { method: "POST", body: { notification_ids: [id] } });
}

/** POST /notifications/mark-read/ with mark_all. */
export async function markAllNotificationsRead(): Promise<void> {
  await request("/notifications/mark-read/", { method: "POST", body: { mark_all: true } });
}

/** DELETE /notifications/{id}/delete/ */
export async function deleteNotification(id: number): Promise<void> {
  await request(`/notifications/${id}/delete/`, { method: "DELETE" });
}

/** "il y a 5 min", "Hier", "12/03/2026" — mirrors the web navbar formatter. */
export function relativeTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `il y a ${diffDays} j`;
  return date.toLocaleDateString("fr-FR");
}
