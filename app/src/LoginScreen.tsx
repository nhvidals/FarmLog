import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { login, register } from "./api";
import { styles } from "./styles";
import { C } from "./theme";
import { Lang, T } from "./i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  t: T;
  lang: Lang;
  setLang: (lang: Lang) => void;
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => void;
  onAuthenticated: (token: string, email: string) => void;
};

export function LoginScreen({ t, lang, setLang, apiBaseUrl, setApiBaseUrl, onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  const submit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail) || password.length < 8) {
      setError(t.valEmailPassword);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const fn = isRegister ? register : login;
      const result = await fn(apiBaseUrl, trimmedEmail, password);
      onAuthenticated(result.token, result.user.email);
    } catch (err: unknown) {
      // A response (any status) means we reached the server; no response means
      // a connectivity problem.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (!status) {
        setError(t.authErrorServer);
      } else if (isRegister && status === 409) {
        setError(t.authErrorEmailTaken);
      } else {
        setError(t.authErrorInvalid);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={loginStyles.container} keyboardShouldPersistTaps="handled">
      <View style={loginStyles.langRow}>
        <Pressable
          style={[styles.langPill, lang === "pt" && styles.langPillActive]}
          onPress={() => setLang("pt")}
        >
          <Text style={[styles.langPillText, lang === "pt" && styles.langPillTextActive]}>PT</Text>
        </Pressable>
        <Pressable
          style={[styles.langPill, lang === "en" && styles.langPillActive]}
          onPress={() => setLang("en")}
        >
          <Text style={[styles.langPillText, lang === "en" && styles.langPillTextActive]}>EN</Text>
        </Pressable>
      </View>

      <Text style={loginStyles.title}>🌿 {t.appTitle}</Text>
      <Text style={loginStyles.subtitle}>{t.signInSubtitle}</Text>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{isRegister ? t.registerTitle : t.loginTitle}</Text>

        <TextInput
          testID="login-email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t.emailPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholderTextColor={C.textMuted}
        />
        <TextInput
          testID="login-password"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t.passwordPlaceholder}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={C.textMuted}
        />
        <Text style={loginStyles.hint}>{t.passwordHint}</Text>

        {!!error && <Text style={loginStyles.error}>{error}</Text>}

        <Pressable
          testID="login-submit"
          style={[styles.primaryBtn, busy && loginStyles.btnDisabled]}
          onPress={submit}
          disabled={busy}
        >
          <Text style={styles.primaryBtnText}>{isRegister ? t.registerButton : t.loginButton}</Text>
        </Pressable>

        <Pressable
          style={styles.outlineBtn}
          onPress={() => { setMode(isRegister ? "login" : "register"); setError(""); }}
          disabled={busy}
        >
          <Text style={styles.outlineBtnText}>{isRegister ? t.toLogin : t.toRegister}</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>API Base URL</Text>
        <TextInput
          style={styles.input}
          value={apiBaseUrl}
          onChangeText={setApiBaseUrl}
          placeholder="http://localhost:4000"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={C.textMuted}
        />
      </View>
    </ScrollView>
  );
}

const loginStyles = {
  container: {
    flexGrow: 1,
    justifyContent: "center" as const,
    padding: 20,
    gap: 8,
    backgroundColor: C.bg,
  },
  langRow: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: C.primaryDark,
    textAlign: "center" as const,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: C.textSub,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 4,
  },
  error: {
    color: C.danger,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 2,
  },
  btnDisabled: {
    opacity: 0.6,
  },
};
