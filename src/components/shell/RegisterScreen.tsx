"use client";

/**
 * RegisterScreen — OWNER self-onboarding.
 *
 * Public registration is restricted to the OWNER role. The form collects the
 * owner identity (name/email/password) plus the company profile (name/slug/plan)
 * so a brand new organization is provisioned in the same transaction. Other
 * roles (ADMIN/MANAGER/MEMBER/VIEWER) are added/removed by the OWNER from the
 * Team Management panel after sign-in — never via public self-registration.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Lock, Mail, User } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import type { ClientSession } from "@/lib/auth/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { HayDevLogo } from "@/components/brand/HayDevLogo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RegisterScreenProps {
  onSignedIn: (session: ClientSession) => void;
  onBackToLogin: () => void;
}

type Plan = "starter" | "growth" | "scale" | "enterprise";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function RegisterScreen({ onSignedIn, onBackToLogin }: RegisterScreenProps) {
  const { t } = useLocale();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [plan, setPlan] = useState<Plan>("starter");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCompanyNameChange(value: string) {
    setCompanyName(value);
    if (!slugTouched) {
      setCompanySlug(slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          company: { name: companyName, slug: companySlug, plan },
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { session: ClientSession }
        | { error?: { message?: string } }
        | null;
      if (!response.ok || !payload || !("session" in payload)) {
        throw new Error(
          payload && "error" in payload
            ? payload.error?.message ?? t("shell.register.failed")
            : t("shell.register.failed"),
        );
      }
      toast.success(t("shell.register.success"));
      onSignedIn(payload.session);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : t("shell.register.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  const year = new Date().getFullYear();

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      {/* Left branded panel — same look as login, minus the cycling tagline. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-sidebar p-10 lg:flex xl:w-[55%] xl:p-14">
        <div className="pointer-events-none absolute inset-0 z-10 bg-grid opacity-[0.35]" />
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "radial-gradient(circle at 25% 15%, color-mix(in oklab, var(--accent-lime) 22%, transparent), transparent 45%), radial-gradient(circle at 80% 75%, color-mix(in oklab, var(--accent-cyan) 18%, transparent), transparent 45%), radial-gradient(circle at 60% 50%, color-mix(in oklab, var(--accent-violet) 12%, transparent), transparent 50%)",
          }}
        />

        {/* Top spacer mirroring the right brand height so the tagline lines up
            with the registration card on the right. */}
        <div className="relative z-20 w-44 aspect-[1536/1024] lg:w-64" aria-hidden />

        <div className="relative z-20 my-auto max-w-xl">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-semibold leading-tight tracking-tight text-foreground xl:text-5xl"
          >
            <span className="text-gradient-brand">{t("shell.register.title")}</span>
          </motion.h1>
          <p className="mt-6 text-sm text-muted-foreground">
            {t("shell.register.subtitle")}
          </p>
        </div>

        <p className="relative z-20 text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {t("shell.login.footer", { year })}
        </p>
      </div>

      {/* Right registration card */}
      <div className="relative flex flex-1 flex-col justify-between p-6 sm:p-10 xl:p-14">
        <div className="relative z-10 flex justify-center">
          <div className="w-44 lg:w-64">
            <HayDevLogo priority />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 my-auto w-full max-w-md self-center"
        >
          <div className="glass-3d rounded-2xl p-6 shadow-2xl sm:p-8">
            <div className="mb-6 space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {t("shell.register.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("shell.register.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-muted-foreground">
                  {t("shell.register.name")}
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 border-border bg-muted/40 pl-9 text-sm"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="register-email" className="text-xs text-muted-foreground">
                  {t("shell.register.email")}
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 border-border bg-muted/40 pl-9 text-sm"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="register-password" className="text-xs text-muted-foreground">
                  {t("shell.register.password")}
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 border-border bg-muted/40 pl-9 text-sm"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              {/* Company name */}
              <div className="space-y-1.5">
                <Label htmlFor="company-name" className="text-xs text-muted-foreground">
                  {t("shell.register.companyName")}
                </Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    className="h-10 border-border bg-muted/40 pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Company slug */}
              <div className="space-y-1.5">
                <Label htmlFor="company-slug" className="text-xs text-muted-foreground">
                  {t("shell.register.companySlug")}
                </Label>
                <Input
                  id="company-slug"
                  type="text"
                  value={companySlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setCompanySlug(slugify(e.target.value));
                  }}
                  className="h-10 border-border bg-muted/40 text-sm"
                  pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
                  required
                />
                <p className="text-[11px] text-muted-foreground/70">
                  {t("shell.register.companySlugHint")}
                </p>
              </div>

              {/* Plan */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("shell.register.plan")}
                </Label>
                <Select value={plan} onValueChange={(value: Plan) => setPlan(value)}>
                  <SelectTrigger className="h-10 border-border bg-muted/40 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">{t("shell.register.plan.starter")}</SelectItem>
                    <SelectItem value="growth">{t("shell.register.plan.growth")}</SelectItem>
                    <SelectItem value="scale">{t("shell.register.plan.scale")}</SelectItem>
                    <SelectItem value="enterprise">{t("shell.register.plan.enterprise")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error ? (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={submitting}
                className={cn(
                  "group relative mt-2 h-11 w-full overflow-hidden bg-primary text-primary-foreground",
                  "hover:bg-primary/90 hover:glow-lime",
                )}
              >
                <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-semibold">
                  {submitting ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-block h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
                      />
                      {t("shell.register.submitting")}
                    </>
                  ) : (
                    <>
                      {t("shell.register.submit")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </span>
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <span>{t("shell.register.haveAccount")}</span>
              <button
                type="button"
                onClick={onBackToLogin}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {t("shell.register.signinLink")}
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] uppercase tracking-wider text-muted-foreground/50">
            {t("shell.login.footer", { year })}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default RegisterScreen;