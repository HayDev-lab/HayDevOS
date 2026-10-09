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
import { AuthFrame } from "@/components/core/AuthFrame";
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

export function RegisterScreen({
  onSignedIn,
  onBackToLogin,
}: RegisterScreenProps) {
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
        { session: ClientSession } | { error?: { message?: string } } | null;
      if (!response.ok || !payload || !("session" in payload)) {
        throw new Error(
          payload && "error" in payload
            ? (payload.error?.message ?? t("shell.register.failed"))
            : t("shell.register.failed"),
        );
      }
      toast.success(t("shell.register.success"));
      onSignedIn(payload.session);
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : t("shell.register.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      title={t("shell.register.title")}
      subtitle={t("shell.register.subtitle")}
    >
      <div className="core-register-form">
        {" "}
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
            <Label
              htmlFor="register-email"
              className="text-xs text-muted-foreground"
            >
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
            <Label
              htmlFor="register-password"
              className="text-xs text-muted-foreground"
            >
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
            <Label
              htmlFor="company-name"
              className="text-xs text-muted-foreground"
            >
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
            <Label
              htmlFor="company-slug"
              className="text-xs text-muted-foreground"
            >
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
            <Select
              value={plan}
              onValueChange={(value: Plan) => setPlan(value)}
            >
              <SelectTrigger className="h-10 border-border bg-muted/40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">
                  {t("shell.register.plan.starter")}
                </SelectItem>
                <SelectItem value="growth">
                  {t("shell.register.plan.growth")}
                </SelectItem>
                <SelectItem value="scale">
                  {t("shell.register.plan.scale")}
                </SelectItem>
                <SelectItem value="enterprise">
                  {t("shell.register.plan.enterprise")}
                </SelectItem>
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
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
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
      </div>
      <p className="core-auth-link">
        {t("shell.register.haveAccount")}{" "}
        <button type="button" onClick={onBackToLogin}>
          {t("shell.register.signinLink")}
        </button>
      </p>
    </AuthFrame>
  );
}
export default RegisterScreen;
