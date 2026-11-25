import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
  blockProfile,
  createMatch,
  displayName,
  fetchCoeurLimits,
  fetchProfileById,
  fetchRelationship,
  fetchUserPhotos,
  likeWithType,
  mediaUrl,
  passProfile,
  profilePhoto,
  reportUser,
  unblockProfile,
  unmatchProfile,
  type ProfilePhoto,
  type Relationship,
  type UserProfile,
} from "../../api/app";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import { AppChrome } from "../../components/AppChrome";
import { isGodMode } from "../../utils/accountAccess";
import { useTheme, useThemedStyles } from "../../theme";

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = Math.round(WINDOW_HEIGHT * 0.55);

const REPORT_REASONS = [
  { value: "fake_profile", label: "Faux profil" },
  { value: "harassment", label: "Harcèlement ou intimidation" },
  { value: "inappropriate_content", label: "Photos ou contenu inapproprié" },
  { value: "scam", label: "Arnaque ou fraude" },
  { value: "underage", label: "Utilisateur potentiellement mineur" },
  { value: "offensive_language", label: "Langage offensant" },
  { value: "spam", label: "Spam" },
  { value: "privacy_violation", label: "Violation de la vie privée" },
  { value: "other", label: "Autre" },
];

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type CircleActionProps = {
  icon: IoniconName;
  iconSize: number;
  accessibilityLabel: string;
  onPress: () => void;
  variant: "pass" | "like" | "coeur";
  size?: "sm" | "lg";
  disabled?: boolean;
  active?: boolean;
  badge?: number;
};

/** Circular action: X · large heart · star, with the accent on the like. */
function CircleAction({
  icon,
  iconSize,
  accessibilityLabel,
  onPress,
  variant,
  size = "sm",
  disabled = false,
  active = false,
  badge,
}: CircleActionProps) {
  const styles = useThemedStyles(baseStyles);
  const { colors: theme } = useTheme();
  const variantStyle =
    variant === "like"
      ? active
        ? styles.circleLikeActive
        : styles.circleLike
      : variant === "coeur"
        ? styles.circleCoeur
        : styles.circlePass;
  const iconColor = disabled
    ? theme.placeholder
    : variant === "like"
      ? "#FFFFFF"
      : variant === "coeur"
        ? theme.purple
        : theme.inkSoft;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: variant === "like" ? active : undefined }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.circle,
        size === "lg" ? styles.circleLg : styles.circleSm,
        variantStyle,
        disabled && styles.circleDisabled,
        pressed && !disabled && styles.circlePressed,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      {typeof badge === "number" ? (
        <View style={styles.circleBadge}>
          <Text style={styles.circleBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Port of frontend/src/pages/ProfileDetail.jsx — every colour, size and section
 * comes from its `pd-*` rules (hero 55vh, card -16px, action bar, dots sheet).
 */
export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profileId = Number(id);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const styles = useThemedStyles(baseStyles);
  const { colors: theme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [relationship, setRelationship] = useState<Relationship>({
    isLiked: false,
    isMatched: false,
    isBlocked: false,
    matchId: null,
    conversationId: null,
  });
  const [coeur, setCoeur] = useState<{
    can_use: boolean;
    remaining: number;
    daily_limit: number;
    is_unlimited?: boolean;
  }>({ can_use: true, remaining: 3, daily_limit: 3 });
  const coeurUnlimited = isGodMode(user) || Boolean(coeur.is_unlimited);

  const [activePhoto, setActivePhoto] = useState(0);
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);
  const [dotsOpen, setDotsOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const viewerRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(profileId)) {
      setError("Profil introuvable.");
      setLoading(false);
      return;
    }
    try {
      const data = await fetchProfileById(profileId);
      setProfile(data);
      const [gallery, relation, limits] = await Promise.all([
        fetchUserPhotos(profileId),
        fetchRelationship(profileId),
        fetchCoeurLimits(),
      ]);
      setPhotos(gallery);
      setRelationship(relation);
      setCoeur(limits);
    } catch (loadError) {
      setError(apiErrorMessage(loadError, "Profil introuvable."));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Main photo first, then the gallery minus duplicates (getAllPhotos in the web page).
  const gallery = useMemo(() => {
    const list: string[] = [];
    const main = profilePhoto(profile);
    if (main) list.push(main);
    photos.forEach((photo) => {
      const url = mediaUrl(photo.image ?? photo.image_url);
      if (url && !list.includes(url)) list.push(url);
    });
    return list;
  }, [profile, photos]);

  const currentPhoto = gallery[activePhoto] ?? gallery[0] ?? null;

  // `.pd-hero-img` is object-fit: cover with object-position: center top — the RN
  // default crops the middle, which cut faces at the top edge under the navbar.
  useEffect(() => {
    setPhotoSize(null);
  }, [currentPhoto]);

  const heroPhotoStyle = photoSize
    ? (() => {
        const scale = Math.max(WINDOW_WIDTH / photoSize.width, HERO_HEIGHT / photoSize.height);
        const width = photoSize.width * scale;
        const height = photoSize.height * scale;
        return { position: "absolute" as const, top: 0, left: (WINDOW_WIDTH - width) / 2, width, height };
      })()
    : ({ width: "100%", height: "100%" } as const);
  const age = profile?.age ?? null;
  const prompts = Array.isArray(profile?.profile_prompts) ? profile.profile_prompts.slice(0, 3) : [];

  // Keep the pager in step with the arrows / dots.
  const scrollViewerTo = (index: number) => {
    const count = gallery.length;
    if (!count) return;
    const next = ((index % count) + count) % count;
    setPhotoIndex(next);
    viewerRef.current?.scrollTo({ x: next * WINDOW_WIDTH, animated: true });
  };

  useEffect(() => {
    if (!photoOpen) return;
    const timer = setTimeout(() => {
      viewerRef.current?.scrollTo({ x: photoIndex * WINDOW_WIDTH, animated: false });
    }, 30);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoOpen]);

  const checkMatch = async () => {
    const myId = (user as { id?: number } | null)?.id;
    if (!myId || !profile) return;
    try {
      const match = await createMatch(myId, profile.id);
      setRelationship((prev) => ({ ...prev, isMatched: true, matchId: match?.id ?? prev.matchId }));
    } catch {
      /* the web logs and keeps the like state */
    }
  };

  const handleLike = async () => {
    if (!profile || relationship.isLiked) return;
    try {
      await likeWithType(profile.id);
      setRelationship((prev) => ({ ...prev, isLiked: true }));
      await checkMatch();
    } catch (likeError) {
      setError(apiErrorMessage(likeError, "Impossible d'envoyer le like."));
    }
  };

  const handlePass = async () => {
    try {
      if (profile) await passProfile(profile.id);
    } finally {
      router.back();
    }
  };

  const handleCoupDeCoeur = async () => {
    if (!profile || (!coeurUnlimited && !coeur.can_use)) return;
    try {
      await likeWithType(profile.id, "coup_de_coeur");
      setRelationship((prev) => ({ ...prev, isLiked: true }));
      if (!coeurUnlimited) {
        setCoeur((prev) => ({
          ...prev,
          remaining: Math.max(0, prev.remaining - 1),
          can_use: prev.remaining > 1,
        }));
      }
      await checkMatch();
    } catch (coeurError) {
      setError(apiErrorMessage(coeurError, "Limite de Coups de Cœur atteinte."));
    }
  };

  const handleUnmatch = async () => {
    if (!relationship.matchId) return;
    try {
      await unmatchProfile(relationship.matchId);
      setRelationship((prev) => ({ ...prev, isMatched: false, matchId: null }));
    } catch (unmatchError) {
      setError(apiErrorMessage(unmatchError, "Impossible d'annuler le match."));
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    try {
      await blockProfile(profile.id);
      router.back();
    } catch (blockError) {
      setError(apiErrorMessage(blockError, "Impossible de bloquer ce profil."));
    }
  };

  const handleUnblock = async () => {
    if (!profile) return;
    try {
      await unblockProfile(profile.id);
      setRelationship((prev) => ({ ...prev, isBlocked: false }));
    } catch (unblockError) {
      setError(apiErrorMessage(unblockError, "Impossible de débloquer ce profil."));
    }
  };

  const submitReport = async () => {
    if (!profile) return;
    if (!reportReason) {
      setReportError("Veuillez sélectionner une raison");
      return;
    }
    setReportSending(true);
    setReportError("");
    try {
      await reportUser(profile.id, reportReason, reportDetails);
      setReportOpen(false);
      setDotsOpen(false);
      setReportReason("");
      setReportDetails("");
    } catch (submitError) {
      setReportError(apiErrorMessage(submitError, "Échec de l'envoi du signalement"));
    } finally {
      setReportSending(false);
    }
  };

  if (loading) {
    return (
      <AppChrome active="discover">
        <View style={styles.centered}>
          <ActivityIndicator color={theme.red} />
          <Text style={styles.loadingText}>Recherche d’un match…</Text>
        </View>
      </AppChrome>
    );
  }

  if (error || !profile) {
    return (
      <AppChrome active="discover">
        <View style={styles.centered}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>💔 {error || "Profil introuvable."}</Text>
          </View>
          <Pressable style={styles.backOutline} onPress={() => router.back()}>
            <Text style={styles.backOutlineText}>← Retour</Text>
          </Pressable>
        </View>
      </AppChrome>
    );
  }

  return (
    <AppChrome active="discover">
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {currentPhoto ? (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  setPhotoIndex(activePhoto);
                  setPhotoOpen(true);
                }}
              >
                <Image
                  source={{ uri: currentPhoto }}
                  style={heroPhotoStyle}
                  resizeMode="cover"
                  onLoad={(event) => setPhotoSize(event.nativeEvent.source)}
                />
              </Pressable>
            ) : (
              <View style={styles.heroEmpty}>
                <Text style={styles.heroEmptyIcon}>👤</Text>
              </View>
            )}

            <Image
              source={require("../../../assets/brand/hero-fade.png")}
              style={styles.heroGradient}
              resizeMode="stretch"
              pointerEvents="none"
            />

            {/* No full-height tap zones here: they used to swallow the tap that
                opens the full-screen viewer. Dots page the hero, the viewer pages
                through every photo (arrows, swipe and thumbnails). */}
            {gallery.length > 1 ? (
              <View style={styles.dots} pointerEvents="box-none">
                {gallery.map((_, index) => (
                  <Pressable
                    key={index}
                    onPress={() => setActivePhoto(index)}
                    hitSlop={8}
                    style={[
                      styles.dot,
                      { width: index === activePhoto ? 24 : 14 },
                      index === activePhoto && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.topbar} pointerEvents="box-none">
              <Pressable style={styles.topbarBtn} onPress={() => router.back()} accessibilityLabel="Retour">
                <Text style={styles.topbarGlyph}>←</Text>
              </Pressable>
              <View style={styles.topbarRight} pointerEvents="box-none">
                {profile.is_verified ? (
                  <View style={styles.verifiedPill} pointerEvents="none">
                    <Text style={styles.verifiedPillText}>✓ Vérifié</Text>
                  </View>
                ) : null}
                <Pressable style={styles.topbarBtn} onPress={() => setDotsOpen(true)} accessibilityLabel="Options">
                  <Text style={styles.dotsGlyph}>•••</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.heroInfo} pointerEvents="none">
              <Text style={styles.heroName}>
                {displayName(profile)}
                {age ? `, ${age}` : ""}
              </Text>
              {profile.location ? (
                <View style={styles.heroCityRow}>
                  <Text style={styles.pin}>📍</Text>
                  <Text style={styles.heroCity}>{profile.location}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.card}>
            <View style={{ height: 12 }} />
            {profile.bio ? (
              <>
                <View style={[styles.section, { paddingTop: 24 }]}>
                  <Text style={styles.sectionLabel}>♥ À PROPOS</Text>
                  <Text style={styles.bio}>{profile.bio}</Text>
                </View>
                <View style={styles.divider} />
              </>
            ) : null}

            <View style={[styles.section, { paddingTop: profile.bio ? 16 : 24 }]}>
              <Text style={styles.sectionLabel}>ⓘ INFOS DE BASE</Text>
              <View style={styles.chipRow}>
                {profile.gender ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipIcon}>⚥</Text>
                    <Text style={styles.chipText}>
                      {profile.gender === "male" ? "Homme" : profile.gender === "female" ? "Femme" : profile.gender}
                    </Text>
                  </View>
                ) : null}
                {age ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipIcon}>🎂</Text>
                    <Text style={styles.chipText}>{age} ans</Text>
                  </View>
                ) : null}
                {profile.height ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipIcon}>📏</Text>
                    <Text style={styles.chipText}>{profile.height} cm</Text>
                  </View>
                ) : null}
                {profile.is_verified ? (
                  <View style={[styles.chip, styles.chipVerified]}>
                    <Text style={[styles.chipIcon, { color: "#22c55e" }]}>✓</Text>
                    <Text style={[styles.chipText, { color: "#22c55e" }]}>Vérifié</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {profile.career || profile.education ? (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>💼 TRAVAIL & ÉTUDES</Text>
                  {profile.career ? (
                    <View style={styles.lineRow}>
                      <Text style={[styles.lineIcon, { width: 16 }]}>💼</Text>
                      <Text style={styles.lineText}>{profile.career}</Text>
                    </View>
                  ) : null}
                  {profile.education ? (
                    <View style={styles.lineRow}>
                      <Text style={[styles.lineIcon, { width: 16 }]}>🎓</Text>
                      <Text style={styles.lineText}>{profile.education}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            {profile.passions || profile.hobbies || profile.favorite_music ? (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>★ CENTRES D’INTÉRÊT</Text>
                  <View style={styles.tagWrap}>
                    {(profile.passions ?? "")
                      .split(",")
                      .filter((item) => item.trim())
                      .map((item, index) => (
                        <View key={`p${index}`} style={[styles.tag, styles.tagPassion]}>
                          <Text style={styles.tagText}>{item.trim()}</Text>
                        </View>
                      ))}
                    {(profile.hobbies ?? "")
                      .split(",")
                      .filter((item) => item.trim())
                      .map((item, index) => (
                        <View key={`h${index}`} style={[styles.tag, styles.tagHobby]}>
                          <Text style={styles.tagText}>{item.trim()}</Text>
                        </View>
                      ))}
                    {profile.favorite_music ? (
                      <>
                        <View style={styles.musicHeading}>
                          <Text style={styles.musicHeadingText}>♫ AMBIANCE MUSICALE</Text>
                        </View>
                        {profile.favorite_music
                          .split(",")
                          .filter((item) => item.trim())
                          .map((item, index) => (
                            <View key={`m${index}`} style={[styles.tag, styles.tagMusic]}>
                              <Text style={styles.tagText}>{item.trim()}</Text>
                            </View>
                          ))}
                      </>
                    ) : null}
                  </View>
                </View>
              </>
            ) : null}

            {prompts.length > 0 ? (
              <>
                <View style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>💬 EN QUELQUES MOTS</Text>
                  {prompts.map((item, index) => (
                    <View key={index} style={styles.promptCard}>
                      <Text style={styles.promptQ}>{item.question}</Text>
                      <Text style={styles.promptA}>{item.answer}</Text>
                      {relationship.isMatched ? (
                        <Pressable
                          style={styles.promptComment}
                          onPress={() =>
                            router.push(
                              relationship.conversationId
                                ? `/messages?conversation=${relationship.conversationId}`
                                : "/messages",
                            )
                          }
                        >
                          <Text style={styles.promptCommentText}>💬 Commenter ça</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            ) : null}

          </View>
        </ScrollView>

        {error ? <Text style={styles.toastError}>{error}</Text> : null}

        {/* Fixed action bar (pd-action-bar) — sits above the bottom nav */}
        <View style={[styles.actionBar, { paddingBottom: 14 }]}>
          {relationship.isBlocked ? (
            <Pressable style={[styles.btn, styles.btnGreen]} onPress={() => void handleUnblock()}>
              <Text style={styles.btnText}>✓ Débloquer</Text>
            </Pressable>
          ) : relationship.isMatched ? (
            <>
              <View style={styles.btnRow}>
                <Pressable
                  style={[styles.btn, styles.btnPink, { flex: 1 }]}
                  onPress={() =>
                    router.push(
                      relationship.conversationId
                        ? `/messages?conversation=${relationship.conversationId}`
                        : "/messages",
                    )
                  }
                >
                  <Text style={styles.btnText}>💬 Envoyer un message</Text>
                </Pressable>
              </View>
              <View style={{ alignItems: "center", marginTop: 4 }}>
                <Pressable onPress={() => void handleUnmatch()}>
                  <Text style={styles.unmatch}>Unmatch</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.actionsRow}>
              <CircleAction
                variant="pass"
                icon="close"
                iconSize={26}
                accessibilityLabel="Passer"
                onPress={() => void handlePass()}
              />
              <CircleAction
                variant="like"
                icon="heart"
                iconSize={34}
                size="lg"
                accessibilityLabel={relationship.isLiked ? "Aimé" : "J'aime"}
                active={relationship.isLiked}
                onPress={() => void handleLike()}
              />
              <CircleAction
                variant="coeur"
                icon="star"
                iconSize={26}
                accessibilityLabel={
                  coeurUnlimited
                    ? "Coup de cœur, illimité"
                    : `Coup de cœur, ${coeur.remaining} restant${coeur.remaining > 1 ? "s" : ""}`
                }
                onPress={() => void handleCoupDeCoeur()}
                disabled={!coeurUnlimited && !coeur.can_use}
                badge={coeurUnlimited ? undefined : coeur.remaining}
              />
            </View>
          )}
        </View>

        {/* ••• menu — anchored popover, no dimming layer over the page */}
        {dotsOpen ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setDotsOpen(false)} />
            <View style={styles.menu}>
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  setDotsOpen(false);
                  setReportOpen(true);
                }}
              >
                <Text style={styles.menuRowText}>🚩 Signaler ce profil</Text>
              </Pressable>
              <Pressable
                style={[styles.menuRow, styles.menuRowBorder]}
                onPress={() => {
                  setDotsOpen(false);
                  void handleBlock();
                }}
              >
                <Text style={[styles.menuRowText, { color: "#FF2D55" }]}>🚫 Bloquer cet utilisateur</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Full screen photo viewer */}
        {/* Opaque full-screen window: a transparent Modal stayed inside the app
            window, so the action bar and bottom nav drew over the photo. */}
        <Modal
          visible={photoOpen}
          animationType="fade"
          transparent={false}
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={() => setPhotoOpen(false)}
        >
          <View style={styles.viewer}>
            <ScrollView
              ref={viewerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / WINDOW_WIDTH);
                setPhotoIndex(Math.min(Math.max(index, 0), gallery.length - 1));
              }}
            >
              {gallery.map((uri, index) => (
                <Pressable
                  key={index}
                  style={styles.viewerPage}
                  onPress={() => setPhotoOpen(false)}
                >
                  <Image source={{ uri }} style={styles.viewerImage} resizeMode="contain" />
                </Pressable>
              ))}
            </ScrollView>

            <Pressable style={[styles.viewerClose, { top: insets.top + 16 }]} onPress={() => setPhotoOpen(false)}>
              <Text style={styles.viewerCloseGlyph}>✕</Text>
            </Pressable>
            {gallery.length > 1 ? (
              <>
                <Pressable
                  style={[styles.viewerArrow, { left: 16 }]}
                  onPress={() => scrollViewerTo(photoIndex - 1)}
                  hitSlop={8}
                >
                  <Text style={styles.viewerArrowGlyph}>‹</Text>
                </Pressable>
                <Pressable
                  style={[styles.viewerArrow, { right: 16 }]}
                  onPress={() => scrollViewerTo(photoIndex + 1)}
                  hitSlop={8}
                >
                  <Text style={styles.viewerArrowGlyph}>›</Text>
                </Pressable>
              </>
            ) : null}
            {gallery.length > 1 ? (
              <View style={styles.viewerThumbs}>
                {gallery.map((uri, index) => (
                  <Pressable key={index} onPress={() => setPhotoIndex(index)} hitSlop={6}>
                    <Image
                      source={{ uri }}
                      style={[styles.viewerThumb, index === photoIndex && styles.viewerThumbActive]}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.viewerCounter}>
              <Text style={styles.viewerCounterText}>
                {photoIndex + 1} / {gallery.length}
              </Text>
            </View>
          </View>
        </Modal>

        {/* Report modal (ReportModal.jsx) */}
        <Modal transparent visible={reportOpen} animationType="fade" onRequestClose={() => setReportOpen(false)}>
          <Pressable style={styles.reportScrim} onPress={() => setReportOpen(false)}>
            <Pressable style={styles.reportCard} onPress={() => undefined}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>Signaler un utilisateur</Text>
                <Pressable onPress={() => setReportOpen(false)}>
                  <Text style={styles.reportClose}>✕</Text>
                </Pressable>
              </View>

              {reportError ? <Text style={styles.reportError}>{reportError}</Text> : null}

              <Text style={styles.reportLabel}>Raison du signalement *</Text>
              <View style={styles.reasonList}>
                {REPORT_REASONS.map((reason) => (
                  <Pressable
                    key={reason.value}
                    style={[styles.reasonRow, reportReason === reason.value && styles.reasonRowActive]}
                    onPress={() => setReportReason(reason.value)}
                  >
                    <Text
                      style={[styles.reasonText, reportReason === reason.value && styles.reasonTextActive]}
                    >
                      {reason.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.reportLabel}>Détails supplémentaires</Text>
              <TextInput
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline
                placeholder="Fournissez toute information complémentaire..."
                placeholderTextColor={theme.placeholder}
                style={styles.reportInput}
              />

              <View style={styles.reportActions}>
                <Pressable style={[styles.reportBtn, styles.reportCancel]} onPress={() => setReportOpen(false)}>
                  <Text style={styles.reportCancelText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.reportBtn, styles.reportSend, reportSending && { opacity: 0.6 }]}
                  onPress={() => void submitReport()}
                  disabled={reportSending}
                >
                  <Text style={styles.reportSendText}>
                    {reportSending ? "Envoi en cours..." : "Envoyer le signalement"}
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

const baseStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FAF8F4" },
  scroll: { paddingBottom: 190 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  loadingText: { color: "#6c757d", fontSize: 12.5 },
  errorBox: { backgroundColor: "#f8d7da", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#f5c2c7" },
  errorText: { color: "#842029", fontSize: 12.5, textAlign: "center" },
  backOutline: { borderWidth: 1, borderColor: "#dc3545", borderRadius: 30, paddingHorizontal: 28, paddingVertical: 10 },
  backOutlineText: { color: "#dc3545", fontWeight: "600" },

  hero: {
    width: "100%",
    height: HERO_HEIGHT,
    backgroundColor: "#1A1A2E",
    overflow: "hidden",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  heroImage: { width: "100%", height: "100%" },
  heroEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroEmptyIcon: { fontSize: 38, color: "#FF2D55" },
  heroGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", width: "100%" },
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
  dots: { position: "absolute", top: 10, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5 },
  dot: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.45)" },
  dotActive: { backgroundColor: "#fff" },

  topbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topbarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  topbarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  topbarGlyph: { color: "#1A1A2E", fontSize: 15 },
  dotsGlyph: { color: "#1A1A2E", fontSize: 13.5, fontWeight: "700", letterSpacing: 1 },
  verifiedPill: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedPillText: { color: "#4ade80", fontSize: 10, fontWeight: "700" },

  heroInfo: { position: "absolute", bottom: 16, left: 16, right: 64 },
  heroName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 23,
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowRadius: 4,
  },
  heroCityRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  pin: { fontSize: 10.5, color: "#FF2D55" },
  heroCity: { fontSize: 12.5, color: "#fff", opacity: 0.92 },

  card: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -16, minHeight: WINDOW_HEIGHT * 0.5 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  divider: { height: 1, backgroundColor: "#F0EEE8", marginTop: 16, marginHorizontal: 20 },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FF2D55",
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  bio: { fontSize: 13.5, lineHeight: 21.5, color: "#4a4a4a" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#F8F5F0",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipVerified: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  chipIcon: { fontSize: 11, color: "#FF2D55" },
  chipText: { fontSize: 12, color: "#2d2d2d" },

  lineRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  lineIcon: { color: "#FF2D55", fontSize: 12.5 },
  lineText: { fontSize: 12.5, color: "#2d2d2d", flex: 1 },

  tagWrap: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8E5DF",
    backgroundColor: "#fff",
    marginRight: 4,
    marginBottom: 6,
  },
  tagPassion: { borderColor: "#ffd8df", backgroundColor: "#fff6f8" },
  tagHobby: { borderColor: "#d7ecff", backgroundColor: "#f5fbff" },
  tagMusic: { borderColor: "#efe2ff", backgroundColor: "#faf7ff" },
  tagText: { fontSize: 12, fontWeight: "500", color: "#2d2d2d" },

  musicHeading: { width: "100%", marginTop: 10, marginBottom: 6 },
  musicHeadingText: { fontSize: 10.5, fontWeight: "700", color: "#FF2D55", letterSpacing: 1.2 },

  promptCard: {
    backgroundColor: "#FAF8F4",
    borderWidth: 1,
    borderColor: "#E8E5DF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  promptQ: { fontSize: 10.5, color: "#999", marginBottom: 6 },
  promptA: { fontSize: 12.5, color: "#1A1A2E", lineHeight: 19 },
  promptComment: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E8E5DF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  promptCommentText: { fontSize: 11, color: "#FF2D55", fontWeight: "500" },

  cardBottom: { height: 24 },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFDFC",
    borderTopWidth: 1,
    borderTopColor: "#F2ECE8",
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: "#1F1A24",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  btnRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  btn: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 999, alignItems: "center", justifyContent: "center", flex: 1 },
  btnPink: { backgroundColor: "#FF2D55" },
  btnGreen: { backgroundColor: "#22c55e", width: "100%", flex: 0 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 13.5 },
  actionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#1F1A24",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  circleSm: { width: 58, height: 58, borderRadius: 29 },
  circleLg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: "#FFE0E8",
    shadowColor: "#D41455",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  circlePass: { backgroundColor: "#FFFFFF", borderColor: "#EDE7E3" },
  circleLike: { backgroundColor: "#FF2D55" },
  circleLikeActive: { backgroundColor: "#D41455" },
  circleCoeur: { backgroundColor: "#FFFFFF", borderColor: "#EADCF4" },
  circleDisabled: { opacity: 0.45 },
  circlePressed: { transform: [{ scale: 0.92 }] },
  circleBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#852A91",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  circleBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  unmatch: { color: "#8e8e93", fontSize: 12, textDecorationLine: "underline" },
  toastError: { position: "absolute", bottom: 150, left: 20, right: 20, color: "#dc3545", fontSize: 12, textAlign: "center" },

  menu: {
    position: "absolute",
    top: 74,
    right: 16,
    minWidth: 224,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0EEE8",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  menuRow: { paddingHorizontal: 16, paddingVertical: 13 },
  menuRowBorder: { borderTopWidth: 1, borderTopColor: "#F0EEE8" },
  menuRowText: { fontSize: 12.5, color: "#1A1A2E" },

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
  viewerCloseGlyph: { fontSize: 18, color: "#1A1A2E" },
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
  viewerCounter: {
    position: "absolute",
    bottom: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewerCounterText: { color: "#fff", fontSize: 14 },

  reportScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 20 },
  reportCard: { width: "100%", maxWidth: 500, backgroundColor: "#fff", borderRadius: 24, padding: 24, maxHeight: "88%" },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  reportTitle: { fontSize: 16, fontWeight: "700", color: "#212529" },
  reportClose: { fontSize: 16, color: "#6c757d" },
  reportError: { backgroundColor: "#f8d7da", color: "#842029", padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 12 },
  reportLabel: { fontSize: 12.5, fontWeight: "600", color: "#212529", marginBottom: 6, marginTop: 8 },
  reasonList: { maxHeight: 200 },
  reasonRow: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  reasonRowActive: { backgroundColor: "#fff0f3" },
  reasonText: { fontSize: 12.5, color: "#212529" },
  reasonTextActive: { color: "#FF2D55", fontWeight: "600" },
  reportInput: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    fontSize: 12.5,
    color: "#212529",
    textAlignVertical: "top",
  },
  reportActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  reportBtn: { flex: 1, height: 46, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  reportCancel: { borderWidth: 1, borderColor: "#6c757d" },
  reportCancelText: { color: "#6c757d", fontWeight: "600" },
  reportSend: { backgroundColor: "#dc3545" },
  reportSendText: { color: "#fff", fontWeight: "600", fontSize: 12.5 },
});
