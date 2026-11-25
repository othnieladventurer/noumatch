import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { checkCanRegister, register, type Gender } from "../api/auth";
import { apiErrorMessage } from "../api/client";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Screen } from "../components/Screen";
import { StepProgress } from "../components/StepProgress";
import { colors, radius, spacing, useTheme, useThemedStyles, useTypography } from "../theme";

type Photo = { uri: string; name: string; type: string };
type EmailState = { status: "idle" | "checking" | "ok" | "error"; message?: string };

const WORDMARK_ASPECT = 1405 / 189;
const EMAIL_PATTERN = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STEP_LABELS = ["Infos", "Genre", "Photo"];

function ageFromBirthDate(value: string): number | null {
  if (!DATE_PATTERN.test(value)) return null;
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * Register — mirrors `frontend/src/pages/Register.jsx`: same three steps
 * (informations → genre → photo), same field set and copy, same stepper.
 * The API calls are unchanged from the previous mobile implementation.
 */
export default function RegisterScreen() {
  const styles = useThemedStyles(baseStyles);
  const type = useTypography();
  const { isDark } = useTheme();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [emailState, setEmailState] = useState<EmailState>({ status: "idle" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Autorisez l'accès aux photos pour choisir une photo de profil.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? `profil-${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    });
    setError("");
  };

  const checkEmail = async (value: string, selectedGender: Gender | null) => {
    const trimmed = value.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailState({ status: "idle" });
      return;
    }

    setEmailState({ status: "checking" });
    try {
      const data = await checkCanRegister(trimmed, selectedGender ?? undefined);
      if (data.exists) {
        setEmailState({ status: "error", message: "Cet email possède déjà un compte. Connectez-vous plutôt." });
        setNotice("");
        return;
      }
      setEmailState({ status: "ok", message: "Adresse email disponible." });
      setNotice(data.can_register === false ? data.message || "Les inscriptions sont momentanément en pause." : "");
    } catch {
      // Soft check only: the register endpoint enforces eligibility anyway.
      setEmailState({ status: "idle" });
    }
  };

  const validateStep1 = (): string | null => {
    if (!firstName.trim() || !lastName.trim()) return "Renseignez votre prénom et votre nom.";
    if (!EMAIL_PATTERN.test(email.trim())) return "Entrez une adresse email valide.";

    const age = ageFromBirthDate(birthDate.trim());
    if (age === null) return "Entrez votre date de naissance au format AAAA-MM-JJ.";
    if (age < 18) return "Vous devez avoir 18 ans ou plus pour vous inscrire.";

    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (password !== password2) return "Les deux mots de passe ne correspondent pas.";
    return null;
  };

  const next = () => {
    setError("");

    if (step === 1) {
      const problem = validateStep1();
      if (problem) {
        setError(problem);
        return;
      }
      if (emailState.status === "idle") void checkEmail(email, gender);
    }

    if (step === 2 && !gender) {
      setError("Indiquez votre genre.");
      return;
    }

    setStep((current) => Math.min(3, current + 1));
  };

  const previous = () => {
    setError("");
    setStep((current) => Math.max(1, current - 1));
  };

  const submit = async () => {
    if (!gender) {
      setStep(2);
      setError("Indiquez votre genre.");
      return;
    }
    if (!photo) {
      setError("Ajoutez une photo de profil.");
      return;
    }

    const problem = validateStep1();
    if (problem) {
      setStep(1);
      setError(problem);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const pending = await register({
        first_name: firstName,
        last_name: lastName,
        email,
        birth_date: birthDate.trim(),
        gender,
        password,
        password2,
        country: "Haïti",
        city: "",
        photo,
      });

      router.push({
        pathname: "/verify",
        params: { userId: String(pending.user_id), email: email.trim().toLowerCase() },
      });
    } catch (err) {
      setError(apiErrorMessage(err, "L'inscription n'a pas abouti. Réessayez."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Image
        source={require("../../assets/brand/logo-wordmark.png")}
        style={[styles.logo, isDark && styles.logoDark]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="NouMatch"
      />

      <Text style={[type.h1, styles.title]}>Créer votre compte</Text>
      <Text style={styles.subtitle}>Rejoignez la communauté NouMatch.</Text>

      <StepProgress step={step} labels={STEP_LABELS} />

      {error ? <Alert>{error}</Alert> : null}
      {!error && notice ? <Alert tone="warning">{notice}</Alert> : null}

      {step === 1 ? (
        <View>
          <Field
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Marie"
            autoCapitalize="words"
            textContentType="givenName"
          />
          <Field
            label="Nom"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Jean-Baptiste"
            autoCapitalize="words"
            textContentType="familyName"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setEmailState({ status: "idle" });
            }}
            onBlur={() => void checkEmail(email, gender)}
            placeholder="email@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={emailState.status === "error" ? emailState.message : undefined}
            hint={
              emailState.status === "checking"
                ? "Vérification de l'adresse…"
                : emailState.status === "ok"
                  ? emailState.message
                  : undefined
            }
            hintTone={emailState.status === "ok" ? "success" : "muted"}
          />
          <Field label="Pays" value="Haïti" editable={false} />
          <Field
            label="Date de naissance"
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="AAAA-MM-JJ"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoCorrect={false}
            hint="Vous devez avoir 18 ans ou plus."
            hintTone="muted"
          />
          <Field
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="Au moins 8 caractères"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
          />
          <Field
            label="Confirmer le mot de passe"
            value={password2}
            onChangeText={setPassword2}
            placeholder="Répétez le mot de passe"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View>
          <Text style={styles.groupLabel}>Genre</Text>
          <View style={styles.genderRow}>
            {(
              [
                { value: "female", label: "Femme" },
                { value: "male", label: "Homme" },
              ] as { value: Gender; label: string }[]
            ).map((option) => {
              const active = gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setGender(option.value);
                    void checkEmail(email, option.value);
                  }}
                  style={[styles.genderOption, active && styles.genderOptionActive]}
                >
                  <Text style={[styles.genderLabel, active && styles.genderLabelActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View>
          <Pressable onPress={pickPhoto} style={styles.photoPicker} accessibilityRole="button" accessibilityLabel="Choisir une photo de profil">
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlus}>+</Text>
              </View>
            )}
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>{photo ? "Changer la photo" : "Ajouter une photo"}</Text>
              <Text style={styles.photoHint}>Une photo nette de votre visage, sans filtre.</Text>
            </View>
          </Pressable>
          {photo ? <Text style={styles.photoSelected}>✓ Photo sélectionnée : {photo.name}</Text> : null}
        </View>
      ) : null}

      <View style={styles.navRow}>
        {step > 1 ? (
          <View style={styles.navItem}>
            <Button title="Retour" variant="ghost" onPress={previous} />
          </View>
        ) : null}
        <View style={styles.navItem}>
          {step < 3 ? (
            <Button title="Continuer" onPress={next} />
          ) : (
            <Button title="Créer mon compte" onPress={submit} loading={loading} />
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Vous avez déjà un compte ?</Text>
        <Pressable onPress={() => router.replace("/login")} hitSlop={8}>
          <Text style={styles.footerLink}>Se connecter</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const baseStyles = StyleSheet.create({
  logo: {
    width: 30 * WORDMARK_ASPECT,
    height: 30,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  logoDark: { tintColor: "#F4F6FB" },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.inkSoft,
    marginBottom: 7,
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderOption: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  genderOptionActive: {
    borderColor: colors.red,
    backgroundColor: "#fdecec",
  },
  genderLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.inkSoft,
  },
  genderLabelActive: {
    color: colors.redDark,
  },
  photoPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  photo: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  photoPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.creamDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlus: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.red,
  },
  photoCopy: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 3,
  },
  photoHint: {
    fontSize: 12,
    color: colors.muted,
  },
  photoSelected: {
    marginTop: 8,
    fontSize: 11,
    color: colors.success,
  },
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: spacing.lg,
  },
  navItem: {
    flex: 1,
  },
  footer: {
    marginTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 12.5,
    color: colors.muted,
  },
  footerLink: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.red,
  },
});
