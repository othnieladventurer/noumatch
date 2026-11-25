import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  deleteMyAccount,
  deleteProfilePhoto,
  displayName,
  fetchProfileById,
  fetchUserPhotos,
  mediaUrl,
  profilePhoto,
  saveProfilePrompts,
  setMainPhoto,
  updateMyProfileForm,
  uploadProfilePhotos,
  type ProfilePhoto,
  type UserProfile,
} from "../api/app";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { AppChrome } from "../components/AppChrome";
import { useTheme, useThemedStyles } from "../theme";

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get("window");
const GALLERY_HEIGHT = Math.round(WINDOW_HEIGHT * 0.5);

const PROMPT_OPTIONS = [
  "Ce qui me fait toujours sourire...",
  "La chose qui me rend unique c'est...",
  "Mon plat haïtien préféré c'est...",
  "Pour moi, une relation parfaite c'est...",
  "Je suis passionné(e) par...",
  "Mon plus grand rêve en Haïti...",
  "Le truc que peu de gens savent sur moi...",
  "Ce que je cherche vraiment c'est...",
  "Un fait amusant sur moi...",
  "Ce que j'aime faire le week-end...",
];

type Form = {
  first_name: string;
  last_name: string;
  bio: string;
  birth_date: string;
  gender: string;
  location: string;
  height: string;
  passions: string;
  career: string;
  education: string;
  hobbies: string;
  favorite_music: string;
};

const EMPTY_FORM: Form = {
  first_name: "",
  last_name: "",
  bio: "",
  birth_date: "",
  gender: "",
  location: "",
  height: "",
  passions: "",
  career: "",
  education: "",
  hobbies: "",
  favorite_music: "",
};

function ageFromBirthDate(value?: string): number | null {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

const chipsOf = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Port of frontend/src/pages/Profile.jsx — gallery, inline editor, photo manager,
 * prompts, account control and the exact `.profile-*` values from its stylesheet.
 */
export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const styles = useThemedStyles(baseStyles);
  const { colors } = useTheme();
  const meId = (user as { id?: number } | null)?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [pickedPhoto, setPickedPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);

  const [prompts, setPrompts] = useState<{ question: string; answer: string }[]>([]);
  const [savingPrompts, setSavingPrompts] = useState(false);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const viewerRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [photoToDelete, setPhotoToDelete] = useState<ProfilePhoto | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const load = useCallback(async () => {
    if (!meId) {
      setLoading(false);
      return;
    }
    try {
      const [data, gallery] = await Promise.all([fetchProfileById(meId), fetchUserPhotos(meId)]);
      setProfile(data);
      setPhotos(gallery);
      setPrompts(Array.isArray(data.profile_prompts) ? data.profile_prompts.slice(0, 3) : []);
      setForm({
        first_name: data.first_name ?? "",
        last_name: data.last_name ?? "",
        bio: data.bio ?? "",
        birth_date: (data.birth_date ?? "").slice(0, 10),
        gender: data.gender ?? "",
        location: data.location ?? data.city ?? "",
        height: data.height ? String(data.height) : "",
        passions: data.passions ?? "",
        career: data.career ?? "",
        education: data.education ?? "",
        hobbies: data.hobbies ?? "",
        favorite_music: data.favorite_music ?? "",
      });
    } catch (loadError) {
      setError(apiErrorMessage(loadError, "Impossible de charger votre profil."));
    } finally {
      setLoading(false);
    }
  }, [meId]);

  useEffect(() => {
    void load();
  }, [load]);

  // getAllPhotos(): main photo first, gallery photos after (deduped).
  const gallery = useMemo(() => {
    const list: string[] = [];
    const main = pickedPhoto?.uri ?? profilePhoto(profile) ?? profilePhoto(user as unknown as UserProfile);
    if (main) list.push(main);
    photos.forEach((photo) => {
      const url = mediaUrl(photo.image ?? photo.image_url);
      if (url && !list.includes(url)) list.push(url);
    });
    return list;
  }, [photos, pickedPhoto, profile, user]);

  const currentPhoto = gallery[activePhoto] ?? gallery[0] ?? null;
  const age = ageFromBirthDate(profile?.birth_date) ?? profile?.age ?? null;

  useEffect(() => {
    if (!photoModalOpen) return;
    const timer = setTimeout(() => {
      viewerRef.current?.scrollTo({ x: modalIndex * WINDOW_WIDTH, animated: false });
    }, 30);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoModalOpen]);

  const scrollViewerTo = (index: number) => {
    const count = gallery.length;
    if (!count) return;
    const next = ((index % count) + count) % count;
    setModalIndex(next);
    viewerRef.current?.scrollTo({ x: next * WINDOW_WIDTH, animated: true });
  };

  const setField = (key: keyof Form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateMyProfileForm(
        {
          bio: form.bio,
          first_name: form.first_name,
          last_name: form.last_name,
          birth_date: form.birth_date || null,
          gender: form.gender || null,
          location: form.location,
          height: form.height ? Number(form.height) : null,
          passions: form.passions,
          career: form.career,
          education: form.education,
          hobbies: form.hobbies,
          favorite_music: form.favorite_music,
        },
        pickedPhoto ?? undefined,
      );
      setProfile((prev) => ({ ...(prev ?? {}), ...updated }));
      setPickedPhoto(null);
      setEditing(false);
      await load();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Impossible d'enregistrer les modifications."));
    } finally {
      setSaving(false);
    }
  };

  const pickMainPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPickedPhoto({
      uri: asset.uri,
      name: asset.fileName ?? "profile.jpg",
      type: asset.mimeType ?? "image/jpeg",
    });
    setActivePhoto(0);
  };

  const uploadPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) return;
    setUploading(true);
    try {
      await uploadProfilePhotos(
        result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName ?? `photo_${index}.jpg`,
          type: asset.mimeType ?? "image/jpeg",
        })),
      );
      await load();
    } catch (uploadError) {
      setError(apiErrorMessage(uploadError, "Échec du téléchargement des photos"));
    } finally {
      setUploading(false);
    }
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      await deleteProfilePhoto(photoToDelete.id);
      setPhotoToDelete(null);
      setActivePhoto(0);
      await load();
    } catch (deleteError) {
      setError(apiErrorMessage(deleteError, "Impossible de supprimer la photo"));
    }
  };

  const handleSetMain = async (photo: ProfilePhoto) => {
    try {
      await setMainPhoto(photo.id);
      setActivePhoto(0);
      await load();
    } catch (mainError) {
      setError(apiErrorMessage(mainError, "Impossible de définir la photo principale"));
    }
  };

  const savePrompts = async () => {
    setSavingPrompts(true);
    try {
      await saveProfilePrompts(prompts);
      await load();
    } catch (promptError) {
      setError(apiErrorMessage(promptError, "Impossible de sauvegarder les prompts"));
    } finally {
      setSavingPrompts(false);
    }
  };

  const addOrUpdatePrompt = (question: string, answer: string) => {
    setPrompts((prev) => {
      const exists = prev.find((item) => item.question === question);
      if (exists) return prev.map((item) => (item.question === question ? { ...item, answer } : item));
      if (prev.length >= 3) return prev;
      return [...prev, { question, answer }];
    });
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteMyAccount();
      setDeleteAccountOpen(false);
      await signOut();
    } catch (deleteError) {
      setError(apiErrorMessage(deleteError, "Impossible de supprimer le compte."));
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <AppChrome active="me">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.red} />
        </View>
      </AppChrome>
    );
  }

  return (
    <AppChrome active="me">
      <View style={styles.page}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* photo-gallery */}
          <View style={styles.gallery}>
            {currentPhoto ? (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  if (editing) return;
                  setModalIndex(activePhoto);
                  setPhotoModalOpen(true);
                }}
              >
                <Image source={{ uri: currentPhoto }} style={styles.mainPhoto} resizeMode="contain" />
              </Pressable>
            ) : null}

            <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Retour">
              <Text style={styles.backGlyph}>←</Text>
            </Pressable>

            {!editing ? (
              <Pressable style={styles.editBtn} onPress={() => setEditing(true)} accessibilityLabel="Modifier">
                <Text style={styles.editGlyph}>✎</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={() => void handleSave()}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "💾 Save"}</Text>
              </Pressable>
            )}

            {!editing && gallery.length > 1 ? (
              <View style={styles.photoCount}>
                <Text style={styles.photoCountText}>
                  🖼 {activePhoto + 1} / {gallery.length}
                </Text>
              </View>
            ) : null}

            {/* Small chevrons only — the rest of the photo stays tappable so it
                opens the full-screen viewer. */}
            {!editing && gallery.length > 1 ? (
              <>
                <Pressable
                  style={[styles.photoNavBtn, { left: 20 }]}
                  hitSlop={10}
                  onPress={() => setActivePhoto((prev) => (prev - 1 + gallery.length) % gallery.length)}
                >
                  <Text style={styles.photoNavGlyph}>‹</Text>
                </Pressable>
                <Pressable
                  style={[styles.photoNavBtn, { right: 20 }]}
                  hitSlop={10}
                  onPress={() => setActivePhoto((prev) => (prev + 1) % gallery.length)}
                >
                  <Text style={styles.photoNavGlyph}>›</Text>
                </Pressable>
              </>
            ) : null}

            {!editing && gallery.length > 1 ? (
              <View style={styles.indicators}>
                {gallery.map((_, index) => (
                  <Pressable
                    key={index}
                    onPress={() => setActivePhoto(index)}
                    style={[styles.indicator, { width: index === activePhoto ? 45 : 30 }, index === activePhoto && styles.indicatorActive]}
                  />
                ))}
              </View>
            ) : null}

            {!editing && gallery.length > 1 ? (
              <View style={styles.thumbStrip}>
                {gallery.map((uri, index) => (
                  <Pressable key={index} onPress={() => setActivePhoto(index)}>
                    <Image source={{ uri }} style={[styles.thumb, index === activePhoto && styles.thumbActive]} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.overlay}>
              <Text style={styles.galleryName}>
                {displayName(profile ?? (user as unknown as UserProfile))}
                <Text style={styles.galleryAge}>{age ? `, ${age}` : ""}</Text>
              </Text>
              {profile?.location ? <Text style={styles.galleryLocation}>📍 {profile.location}</Text> : null}

              {editing ? (
                <Pressable style={styles.miniUpload} onPress={() => void pickMainPhoto()}>
                  <Text style={styles.miniUploadText}>📷 Change Main Photo</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Profile updated successfully!</Text>
            </View>
          ) : null}

          <View style={styles.content}>
            {editing ? (
              <View style={styles.banner}>
                <View style={styles.bannerIcon}>
                  <Text style={{ fontSize: 18, color: "#ffccd5" }}>✨</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>Make your profile feel complete</Text>
                  <Text style={styles.bannerText}>
                    Update the details people see first, then save once everything looks right.
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={[styles.section, { paddingTop: 12, paddingBottom: 0, borderBottomWidth: 0 }]}>
              <View style={{ alignItems: "flex-end" }}>
                {profile?.is_verified ? (
                  <View style={[styles.verification, styles.verifiedBadge]}>
                    <Text style={[styles.verificationText, { color: "#155724" }]}>✓ Compte vérifié</Text>
                  </View>
                ) : (
                  <View style={[styles.verification, styles.unverifiedBadge]}>
                    <Text style={[styles.verificationText, { color: "#721c24" }]}>🕒 Non vérifié</Text>
                  </View>
                )}
              </View>
            </View>

            {/* À propos de toi */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>♥ À propos de toi</Text>

              {!editing ? (
                <>
                  <View style={styles.aboutText}>
                    <Text style={styles.aboutBody}>
                      <Text style={{ color: "#ff4d6d", opacity: 0.5 }}>“ </Text>
                      {profile?.bio || "Tu n'as pas encore ajouté de bio"}
                      <Text style={{ color: "#ff4d6d", opacity: 0.5 }}> ”</Text>
                    </Text>
                  </View>

                  <View style={styles.infoChips}>
                    {profile?.gender ? (
                      <View style={styles.infoChip}>
                        <Text style={styles.infoChipIcon}>⚥</Text>
                        <Text style={styles.infoChipText}>
                          {profile.gender === "male" ? "Homme" : profile.gender === "female" ? "Femme" : profile.gender}
                        </Text>
                      </View>
                    ) : null}
                    {profile?.height ? (
                      <View style={styles.infoChip}>
                        <Text style={styles.infoChipIcon}>📏</Text>
                        <Text style={styles.infoChipText}>{profile.height} cm</Text>
                      </View>
                    ) : null}
                    {age ? (
                      <View style={styles.infoChip}>
                        <Text style={styles.infoChipIcon}>🎂</Text>
                        <Text style={styles.infoChipText}>{age} years</Text>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : (
                <View style={{ gap: 12 }}>
                  <View>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Bio</Text>
                      <Pressable onPress={() => setField("bio", "")}>
                        <Text style={styles.clearBio}>Clear bio</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      value={form.bio}
                      onChangeText={(value) => setField("bio", value)}
                      multiline
                      placeholder="Tell others about yourself..."
                      placeholderTextColor={colors.placeholder}
                      style={[styles.input, styles.inputArea]}
                    />
                  </View>

                  <View style={styles.twoCols}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>First Name</Text>
                      <TextInput value={form.first_name} onChangeText={(v) => setField("first_name", v)} style={styles.input} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Last Name</Text>
                      <TextInput value={form.last_name} onChangeText={(v) => setField("last_name", v)} style={styles.input} />
                    </View>
                  </View>

                  <View style={styles.twoCols}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Birth Date</Text>
                      <TextInput
                        value={form.birth_date}
                        onChangeText={(v) => setField("birth_date", v)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.placeholder}
                        style={styles.input}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Height (cm)</Text>
                      <TextInput
                        value={form.height}
                        onChangeText={(v) => setField("height", v.replace(/[^0-9]/g, ""))}
                        keyboardType="number-pad"
                        placeholder="e.g. 175"
                        placeholderTextColor={colors.placeholder}
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View>
                    <Text style={styles.label}>Gender</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {[
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "other", label: "Other" },
                      ].map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => setField("gender", option.value)}
                          style={[styles.genderChip, form.gender === option.value && styles.genderChipActive]}
                        >
                          <Text style={[styles.genderText, form.gender === option.value && { color: "#fff" }]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text style={styles.label}>Location</Text>
                    <TextInput
                      value={form.location}
                      onChangeText={(v) => setField("location", v)}
                      placeholder="City, Country"
                      placeholderTextColor={colors.placeholder}
                      style={styles.input}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Your Photos */}
            {!editing ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🖼 Your Photos ({photos.length}/10)</Text>

                {uploading ? (
                  <View style={{ alignItems: "center", paddingVertical: 12 }}>
                    <ActivityIndicator color={colors.red} />
                    <Text style={{ marginTop: 8, color: "#6c757d" }}>Uploading photos...</Text>
                  </View>
                ) : null}

                <View style={styles.photoGrid}>
                  {photos.map((photo) => {
                    const uri = mediaUrl(photo.image ?? photo.image_url);
                    if (!uri) return null;
                    return (
                      <View key={photo.id} style={styles.galleryItem}>
                        <Image source={{ uri }} style={styles.galleryItemImage} />
                        <View style={styles.galleryItemActions}>
                          <Pressable style={styles.galleryItemBtn} onPress={() => void handleSetMain(photo)}>
                            <Text style={styles.galleryItemMainText}>★ Main</Text>
                          </Pressable>
                          <Pressable style={styles.galleryItemBtn} onPress={() => setPhotoToDelete(photo)}>
                            <Text style={styles.galleryItemDeleteText}>🗑 Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}

                  {photos.length < 10 ? (
                    <Pressable style={styles.uploadPlaceholder} onPress={() => void uploadPhotos()}>
                      <Text style={{ fontSize: 18, color: "#6c757d" }}>⤴</Text>
                      <Text style={styles.uploadLabel}>Upload</Text>
                      <Text style={styles.uploadLeft}>{10 - photos.length} left</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Work & Education */}
            {profile?.career || profile?.education || editing ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💼 Work &amp; Education</Text>
                {!editing ? (
                  <View style={{ gap: 12 }}>
                    {profile?.career ? (
                      <View style={styles.professionalCard}>
                        <Text style={styles.professionalLabel}>Career</Text>
                        <Text style={styles.professionalValue}>💼 {profile.career}</Text>
                      </View>
                    ) : null}
                    {profile?.education ? (
                      <View style={styles.professionalCard}>
                        <Text style={styles.professionalLabel}>Education</Text>
                        <Text style={styles.professionalValue}>🎓 {profile.education}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <View>
                      <Text style={styles.label}>Career</Text>
                      <TextInput
                        value={form.career}
                        onChangeText={(v) => setField("career", v)}
                        placeholder="e.g. Software Engineer"
                        placeholderTextColor={colors.placeholder}
                        style={styles.input}
                      />
                    </View>
                    <View>
                      <Text style={styles.label}>Education</Text>
                      <TextInput
                        value={form.education}
                        onChangeText={(v) => setField("education", v)}
                        placeholder="e.g. University of Example"
                        placeholderTextColor={colors.placeholder}
                        style={styles.input}
                      />
                    </View>
                  </View>
                )}
              </View>
            ) : null}

            {/* Interests & Vibes */}
            {profile?.passions || profile?.hobbies || profile?.favorite_music || editing ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>★ Interests &amp; Vibes</Text>
                {!editing ? (
                  <>
                    {profile?.passions ? (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={styles.interestHeading}>🔥 Passions</Text>
                        <View style={styles.interestTags}>
                          {chipsOf(profile.passions).map((item, index) => (
                            <View key={index} style={[styles.interestTag, styles.passionTag]}>
                              <Text style={styles.interestText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    {profile?.hobbies ? (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={styles.interestHeading}>✏️ Hobbies</Text>
                        <View style={styles.interestTags}>
                          {chipsOf(profile.hobbies).map((item, index) => (
                            <View key={index} style={[styles.interestTag, styles.hobbyTag]}>
                              <Text style={styles.interestText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    {profile?.favorite_music ? (
                      <View style={{ marginBottom: 8 }}>
                        <Text style={styles.interestHeading}>🎵 Music Vibes</Text>
                        <View style={styles.interestTags}>
                          {chipsOf(profile.favorite_music).map((item, index) => (
                            <View key={index} style={[styles.interestTag, styles.musicTag]}>
                              <Text style={styles.interestText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <View style={{ gap: 12 }}>
                    <EditableInterests
                      label="Passions"
                      value={form.passions}
                      onChange={(v) => setField("passions", v)}
                      tagStyle={styles.passionTag}
                    />
                    <EditableInterests
                      label="Hobbies"
                      value={form.hobbies}
                      onChange={(v) => setField("hobbies", v)}
                      tagStyle={styles.hobbyTag}
                    />
                    <EditableInterests
                      label="Favorite Music"
                      value={form.favorite_music}
                      onChange={(v) => setField("favorite_music", v)}
                      tagStyle={styles.musicTag}
                    />
                  </View>
                )}
              </View>
            ) : null}

            {/* Prompts */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💬 Partage quelque chose sur toi</Text>
              <Text style={styles.promptHelp}>
                Choisis jusqu'à 3 questions et réponds-y. Elles apparaîtront sur ton profil.
              </Text>

              <View style={{ gap: 10, marginBottom: 16 }}>
                {prompts.map((item) => (
                  <View key={item.question} style={styles.promptCard}>
                    <Text style={styles.promptQuestion}>{item.question}</Text>
                    <TextInput
                      value={item.answer}
                      onChangeText={(value) => addOrUpdatePrompt(item.question, value)}
                      multiline
                      maxLength={200}
                      placeholder="Ta réponse..."
                      placeholderTextColor={colors.placeholder}
                      style={styles.promptInput}
                    />
                    <Pressable
                      style={styles.promptRemove}
                      onPress={() => setPrompts((prev) => prev.filter((entry) => entry.question !== item.question))}
                    >
                      <Text style={{ fontSize: 14, color: "#999" }}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              {prompts.length < 3 ? (
                <View>
                  <Text style={styles.promptPickerLabel}>Ajouter une question ({prompts.length}/3)</Text>
                  <View style={{ gap: 6 }}>
                    {PROMPT_OPTIONS.filter((question) => !prompts.find((entry) => entry.question === question)).map(
                      (question) => (
                        <Pressable
                          key={question}
                          style={styles.promptOption}
                          onPress={() => addOrUpdatePrompt(question, "")}
                        >
                          <Text style={styles.promptOptionText}>+ {question}</Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                </View>
              ) : null}

              {prompts.length > 0 ? (
                <Pressable
                  style={[styles.promptSave, savingPrompts && { opacity: 0.6 }]}
                  onPress={() => void savePrompts()}
                  disabled={savingPrompts}
                >
                  <Text style={styles.promptSaveText}>{savingPrompts ? "Sauvegarde..." : "Sauvegarder"}</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Account control */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: "#d63354" }]}>🛡 Account Control</Text>
              <View style={styles.accountBox}>
                <Text style={{ fontWeight: "700", fontSize: 14, color: "#212529" }}>Delete account</Text>
                <Text style={{ color: "#6c757d", lineHeight: 19.5, marginTop: 4 }}>
                  Remove your account and its related data if you no longer want to use NouMatch.
                </Text>
                <Pressable style={styles.deleteAccountBtn} onPress={() => setDeleteAccountOpen(true)}>
                  <Text style={styles.deleteAccountText}>Delete my account</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.actionButtons}>
              {editing ? (
                <>
                  <Pressable
                    style={[styles.actionBtn, styles.actionPrimary, saving && { opacity: 0.6 }]}
                    onPress={() => void handleSave()}
                    disabled={saving}
                  >
                    <Text style={styles.actionPrimaryText}>{saving ? "Saving..." : "💾 Save Changes"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.actionSecondary]}
                    onPress={() => {
                      setEditing(false);
                      setPickedPhoto(null);
                      void load();
                    }}
                    disabled={saving}
                  >
                    <Text style={styles.actionSecondaryText}>✕ Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={[styles.actionBtn, styles.actionPrimary]} onPress={() => setEditing(true)}>
                  <Text style={styles.actionPrimaryText}>✎ Edit Profile</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.memberSince}>
              ♥ Member since{" "}
              {profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString() : "recently"}
            </Text>
          </View>
        </ScrollView>

        {/* Full size photo */}
        <Modal
          visible={photoModalOpen}
          animationType="fade"
          transparent={false}
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={() => setPhotoModalOpen(false)}
        >
          <View style={styles.viewer}>
            <ScrollView
              ref={viewerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / WINDOW_WIDTH);
                setModalIndex(Math.min(Math.max(index, 0), gallery.length - 1));
              }}
            >
              {gallery.map((uri, index) => (
                <Pressable key={index} style={styles.viewerPage} onPress={() => setPhotoModalOpen(false)}>
                  <Image source={{ uri }} style={styles.viewerImage} resizeMode="contain" />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={[styles.viewerClose, { top: insets.top + 16 }]} onPress={() => setPhotoModalOpen(false)}>
              <Text style={{ fontSize: 18 }}>✕</Text>
            </Pressable>
            {gallery.length > 1 ? (
              <>
                <Pressable
                  style={[styles.viewerArrow, { left: 16 }]}
                  onPress={() => scrollViewerTo(modalIndex - 1)}
                  hitSlop={8}
                >
                  <Text style={styles.viewerArrowGlyph}>‹</Text>
                </Pressable>
                <Pressable
                  style={[styles.viewerArrow, { right: 16 }]}
                  onPress={() => scrollViewerTo(modalIndex + 1)}
                  hitSlop={8}
                >
                  <Text style={styles.viewerArrowGlyph}>›</Text>
                </Pressable>
              </>
            ) : null}
            {gallery.length > 1 ? (
              <View style={styles.viewerThumbs}>
                {gallery.map((uri, index) => (
                  <Pressable key={index} onPress={() => setModalIndex(index)} hitSlop={6}>
                    <Image source={{ uri }} style={[styles.viewerThumb, index === modalIndex && styles.viewerThumbActive]} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.viewerCounter}>
              <Text style={{ color: "#fff", fontSize: 14 }}>
                {modalIndex + 1} / {gallery.length}
              </Text>
            </View>
          </View>
        </Modal>

        {/* Delete photo */}
        <Modal transparent visible={Boolean(photoToDelete)} animationType="fade" onRequestClose={() => setPhotoToDelete(null)}>
          <Pressable style={styles.dialogScrim} onPress={() => setPhotoToDelete(null)}>
            <Pressable style={styles.dialog} onPress={() => undefined}>
              <View style={styles.dialogIcon}>
                <Text style={{ fontSize: 24, color: "#ff4d6d" }}>🗑</Text>
              </View>
              <Text style={styles.dialogTitle}>Delete this photo?</Text>
              <Text style={styles.dialogText}>This will remove the photo from your profile gallery.</Text>
              <View style={styles.dialogActions}>
                <Pressable style={[styles.dialogBtn, styles.dialogCancel]} onPress={() => setPhotoToDelete(null)}>
                  <Text style={{ fontWeight: "600" }}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.dialogBtn, styles.dialogDelete]} onPress={() => void confirmDeletePhoto()}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Delete account */}
        <Modal
          transparent
          visible={deleteAccountOpen}
          animationType="fade"
          onRequestClose={() => setDeleteAccountOpen(false)}
        >
          <Pressable style={styles.dialogScrim} onPress={() => setDeleteAccountOpen(false)}>
            <Pressable style={styles.dialog} onPress={() => undefined}>
              <Text style={styles.dialogTitle}>Delete your account?</Text>
              <Text style={styles.dialogText}>
                This permanently removes your profile, photos and matches. This cannot be undone.
              </Text>
              <View style={styles.dialogActions}>
                <Pressable style={[styles.dialogBtn, styles.dialogCancel]} onPress={() => setDeleteAccountOpen(false)}>
                  <Text style={{ fontWeight: "600" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.dialogBtn, styles.dialogDelete, deletingAccount && { opacity: 0.6 }]}
                  onPress={() => void confirmDeleteAccount()}
                  disabled={deletingAccount}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    {deletingAccount ? "Deleting..." : "Delete my account"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </AppChrome>
  );
}

function EditableInterests({
  label,
  value,
  onChange,
  tagStyle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  tagStyle: object;
}) {
  const styles = useThemedStyles(baseStyles);
  const { colors } = useTheme();
  const chips = chipsOf(value);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Separate with commas"
        placeholderTextColor={colors.placeholder}
        style={styles.input}
      />
      {chips.length > 0 ? (
        <View style={styles.previewBox}>
          <View style={styles.interestTags}>
            {chips.map((item, index) => (
              <View key={index} style={[styles.interestTag, tagStyle]}>
                <Text style={styles.interestText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7fb" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },

  gallery: {
    width: "100%",
    height: GALLERY_HEIGHT,
    backgroundColor: "#111",
    overflow: "hidden",
    // Separates the photo from the white navbar instead of touching it.
    marginTop: 8,
  },
  mainPhoto: { width: "100%", height: "100%" },

  backBtn: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  backGlyph: { color: "#ff4d6d", fontSize: 16 },
  editBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  editGlyph: { color: "#ff4d6d", fontSize: 15 },
  saveBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: "#ff4d6d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },

  photoCount: {
    position: "absolute",
    top: 20,
    right: 80,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },
  photoCountText: { color: "#fff", fontSize: 12.5, fontWeight: "500" },

  photoNavBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ff4d6d",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.95,
  },
  photoNavGlyph: { color: "#fff", fontSize: 19 },

  indicators: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  indicator: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  indicatorActive: { backgroundColor: "#ff4d6d" },

  thumbStrip: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 30,
  },
  thumb: { width: 40, height: 40, borderRadius: 8, opacity: 0.7, borderWidth: 2, borderColor: "transparent" },
  thumbActive: { opacity: 1, borderColor: "#ff4d6d" },

  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  galleryName: { fontSize: 26, fontWeight: "700", color: "#fff", letterSpacing: -0.5 },
  galleryAge: { fontSize: 18, fontWeight: "400", opacity: 0.9 },
  galleryLocation: { fontSize: 12.5, color: "#fff", opacity: 0.9, marginTop: 4 },
  miniUpload: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  miniUploadText: { color: "#ff3355", fontWeight: "800", fontSize: 12 },

  content: { backgroundColor: "#fff", borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30 },
  section: { padding: 18, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#201b1d", marginBottom: 16, letterSpacing: -0.4 },

  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    margin: 18,
    marginBottom: 4,
    padding: 18,
    borderRadius: 26,
    backgroundColor: "#1b1218",
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: -0.4, marginBottom: 4 },
  bannerText: { color: "rgba(255,255,255,0.76)", fontSize: 12.5 },

  verification: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 30 },
  verifiedBadge: { backgroundColor: "#d4edda" },
  unverifiedBadge: { backgroundColor: "#f8d7da" },
  verificationText: { fontSize: 12, fontWeight: "600" },

  aboutText: { backgroundColor: "#f8f9fa", padding: 20, borderRadius: 16 },
  aboutBody: { fontSize: 13.5, lineHeight: 21.5, color: "#4a4a4a" },
  infoChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  infoChip: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#e9ecef",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoChipIcon: { color: "#ff4d6d", fontSize: 11 },
  infoChipText: { color: "#2d2d2d", fontSize: 12.5 },

  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 12.5, fontWeight: "800", marginBottom: 6, color: "#31272b" },
  clearBio: { color: "#dc3545", fontWeight: "600", fontSize: 12 },
  input: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#f0cfd7",
    borderRadius: 16,
    fontSize: 13.5,
    color: "#212529",
    backgroundColor: "#fff",
  },
  inputArea: { minHeight: 80, textAlignVertical: "top" },
  twoCols: { flexDirection: "row", gap: 12 },
  genderChip: { flex: 1, paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: "#f0cfd7", alignItems: "center" },
  genderChipActive: { backgroundColor: "#ff4d6d", borderColor: "#ff4d6d" },
  genderText: { fontSize: 12.5, color: "#31272b" },

  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  galleryItem: { width: "30%", aspectRatio: 1, borderRadius: 20, overflow: "hidden", backgroundColor: "#f8f9fa" },
  galleryItemImage: { width: "100%", height: "100%" },
  galleryItemActions: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 6, justifyContent: "center", padding: 6 },
  galleryItemBtn: { backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  galleryItemMainText: { fontSize: 10.5, fontWeight: "700", color: "#ff4d6d" },
  galleryItemDeleteText: { fontSize: 10.5, fontWeight: "700", color: "#dc3545" },
  uploadPlaceholder: {
    width: "30%",
    aspectRatio: 1,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#ffc4d0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "#fff5f7",
  },
  uploadLabel: { fontSize: 12, color: "#6c757d" },
  uploadLeft: { fontSize: 10.5, color: "#adb5bd" },

  professionalCard: { backgroundColor: "#f8f9fa", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e9ecef" },
  professionalLabel: { fontSize: 11, color: "#6c757d", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  professionalValue: { fontSize: 14, fontWeight: "500", color: "#2d2d2d" },

  interestHeading: { fontSize: 12.5, fontWeight: "600", color: "#4a4a4a", marginBottom: 8 },
  interestTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestTag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30, borderWidth: 1, borderColor: "#e9ecef", backgroundColor: "#f8f9fa" },
  passionTag: { borderColor: "#ffd8df", backgroundColor: "#fff6f8" },
  hobbyTag: { borderColor: "#d7ecff", backgroundColor: "#f5fbff" },
  musicTag: { borderColor: "#efe2ff", backgroundColor: "#faf7ff" },
  interestText: { fontSize: 12.5, color: "#2d2d2d", fontWeight: "500" },
  previewBox: { marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "#e5e7eb", backgroundColor: "#fafafa" },

  promptHelp: { fontSize: 12, color: "#999", marginBottom: 16 },
  promptCard: { backgroundColor: "#FAF8F4", borderWidth: 1, borderColor: "#E8E5DF", borderRadius: 12, padding: 14 },
  promptQuestion: { fontSize: 11, color: "#999", marginBottom: 6 },
  promptInput: { fontSize: 12.5, color: "#1A1A2E", minHeight: 40, textAlignVertical: "top", padding: 0 },
  promptRemove: { position: "absolute", top: 10, right: 12 },
  promptPickerLabel: { fontSize: 11, color: "#999", marginBottom: 8 },
  promptOption: { borderWidth: 1, borderColor: "#E8E5DF", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff" },
  promptOptionText: { fontSize: 12, color: "#1A1A2E" },
  promptSave: { marginTop: 16, alignSelf: "flex-start", backgroundColor: "#FF2D55", borderRadius: 999, paddingHorizontal: 24, paddingVertical: 10 },
  promptSaveText: { color: "#fff", fontSize: 12.5, fontWeight: "600" },

  accountBox: {
    borderWidth: 1,
    borderColor: "rgba(214,51,84,0.16)",
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#fff7f9",
  },
  deleteAccountBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    minWidth: 180,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(214,51,84,0.28)",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  deleteAccountText: { color: "#d63354", fontWeight: "700" },

  actionButtons: { flexDirection: "row", justifyContent: "center", gap: 12, padding: 24, flexWrap: "wrap" },
  actionBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 40, minWidth: 130, alignItems: "center" },
  actionPrimary: { backgroundColor: "#ff3355" },
  actionPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 13.5 },
  actionSecondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#2d2d2d" },
  actionSecondaryText: { color: "#2d2d2d", fontWeight: "600", fontSize: 13.5 },

  memberSince: { textAlign: "center", color: "#6c757d", fontSize: 12, paddingBottom: 24 },
  error: { color: "#dc3545", fontSize: 12, paddingHorizontal: 18, paddingTop: 12 },
  successBanner: { backgroundColor: "#d4edda", marginHorizontal: 18, marginTop: 12, padding: 12, borderRadius: 12 },
  successText: { color: "#155724", fontSize: 12.5, fontWeight: "600" },

  viewer: { flex: 1, backgroundColor: "#000" },
  viewerPage: { width: WINDOW_WIDTH, height: "100%", alignItems: "center", justifyContent: "center" },
  viewerImage: { width: WINDOW_WIDTH, height: "100%" },
  viewerClose: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ff4d6d",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerArrowGlyph: { color: "#fff", fontSize: 22 },
  viewerCounter: { position: "absolute", bottom: 40, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  viewerThumbs: {
    position: "absolute",
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  viewerThumb: { width: 40, height: 54, borderRadius: 8, opacity: 0.55, borderWidth: 2, borderColor: "transparent" },
  viewerThumbActive: { opacity: 1, borderColor: "#ff4d6d" },

  dialogScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 22, padding: 24 },
  dialogIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff0f3",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  dialogTitle: { fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 8, color: "#212529" },
  dialogText: { color: "#6c757d", textAlign: "center", lineHeight: 19.5 },
  dialogActions: { flexDirection: "row", gap: 12, marginTop: 22 },
  dialogBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dialogCancel: { borderWidth: 1, borderColor: "#dee2e6", backgroundColor: "#fff" },
  dialogDelete: { backgroundColor: "#ff4d6d" },
});
