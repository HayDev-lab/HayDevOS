"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthFrame } from "@/components/core/AuthFrame";
import { useLocale } from "@/lib/i18n";
import type { ClientSession } from "@/lib/auth/types";

interface LoginScreenProps {
  onSignIn: (session: ClientSession) => void;
  onGoToRegister?: () => void;
  sessionExpired?: boolean;
}

export function LoginScreen({
  onSignIn,
  onGoToRegister,
  sessionExpired = false,
}: LoginScreenProps) {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => null)) as {
        session?: ClientSession;
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.session)
        throw new Error(payload?.error?.message ?? t("shell.login.failed"));
      toast.success(t("shell.toast.signedIn"));
      onSignIn(payload.session);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : t("shell.login.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthFrame
      title={t("shell.login.title")}
      subtitle={t("shell.login.subtitle")}
    >
      <form onSubmit={submit} className="core-auth-form">
        {sessionExpired && (
          <p role="status" className="core-auth-notice">
            {t("shell.login.sessionExpired")}
          </p>
        )}
        <label htmlFor="email">
          {t("shell.login.email")}
          <span className="core-input-wrap">
            <Mail />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </span>
        </label>
        <label htmlFor="password">
          {t("shell.login.password")}
          <span className="core-input-wrap">
            <Lock />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </span>
        </label>
        {error && (
          <p role="alert" className="core-auth-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="core-gold-button"
          disabled={submitting}
        >
          {submitting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <ArrowRight />
          )}
          {t(submitting ? "shell.login.signingIn" : "shell.login.signin")}
        </button>
      </form>
      {onGoToRegister && (
        <p className="core-auth-link">
          {t("shell.login.noAccount")}{" "}
          <button type="button" onClick={onGoToRegister}>
            {t("shell.login.registerLink")}
          </button>
        </p>
      )}
    </AuthFrame>
  );
}

export default LoginScreen;
