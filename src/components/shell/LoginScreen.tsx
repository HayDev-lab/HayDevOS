"use client";

/**
 * LoginScreen — premium dark login.
 *
 * Left: branded panel with HayDevOS wordmark + cycling tri-lingual tagline +
 * subtle animated background (CSS gradient mesh + grid, no WebGL).
 * Right: graphite glass login card with email/password (prefilled),
 * org selector, language switcher, and a lime-accent "Sign in" button.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Lock,
  Mail,
  Building2,
  Globe,
  ChevronDown,
  ArrowRight,
  Check,
} from "lucide-react";

import { useLocale, LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { useAppStore, MOCK_ORGS } from "@/lib/store/app-store";
import { cn, initials } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LoginBackground } from "./LoginBackground";

interface LoginScreenProps {
  onSignIn: () => void;
}

const TAGLINE_KEYS = [
  "shell.login.tagline1",
  "shell.login.tagline2",
  "shell.login.tagline3",
] as const;

export function LoginScreen({ onSignIn }: LoginScreenProps) {
  const { t, locale, setLocale } = useLocale();
  const { setActiveOrg, activeOrgId } = useAppStore();

  const [email, setEmail] = useState("owner@haydev.os");
  const [password, setPassword] = useState("demo");
  const [submitting, setSubmitting] = useState(false);
  const [taglineIdx, setTaglineIdx] = useState(0);

  // Cycle the tagline every 3.5s.
  useEffect(() => {
    const id = setInterval(() => {
      setTaglineIdx((i) => (i + 1) % TAGLINE_KEYS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(t("shell.toast.signedIn"));
      onSignIn();
    }, 650);
  }

  const year = new Date().getFullYear();

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      {/* ───────────────── Left branded panel ───────────────── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-sidebar p-10 lg:flex xl:w-[55%] xl:p-14">
        {/* Animated canvas constellation (z-0, decorative) */}
        <LoginBackground />
        {/* Animated gradient mesh + grid */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-grid opacity-[0.35]" />
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "radial-gradient(circle at 25% 15%, color-mix(in oklab, var(--accent-lime) 22%, transparent), transparent 45%), radial-gradient(circle at 80% 75%, color-mix(in oklab, var(--accent-cyan) 18%, transparent), transparent 45%), radial-gradient(circle at 60% 50%, color-mix(in oklab, var(--accent-violet) 12%, transparent), transparent 50%)",
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute z-10 -top-32 -left-32 h-80 w-80 rounded-full bg-lime/10 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute z-10 -bottom-24 right-10 h-72 w-72 rounded-full bg-cyan/10 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Brand */}
        <div className="relative z-20 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lime glow-lime">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              HayDev<span className="text-lime">OS</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              Enterprise Edition
            </p>
          </div>
        </div>

        {/* Centerpiece tagline */}
        <div className="relative z-20 max-w-xl">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-semibold leading-tight tracking-tight text-foreground xl:text-5xl"
          >
            The operating system
            <br />
            for <span className="text-gradient-brand">ambitious teams.</span>
          </motion.h1>

          <div className="mt-6 h-7 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={taglineIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-sm text-muted-foreground"
              >
                {t(TAGLINE_KEYS[taglineIdx])}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              "Lead-to-cash",
              "Document AI",
              "Automations",
              "ERP Hub",
              "Owner AI",
            ].map((feat, i) => (
              <motion.span
                key={feat}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.06 }}
                className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
              >
                {feat}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-20 text-[10px] uppercase tracking-wider text-muted-foreground/60">
          {t("shell.login.footer", { year })}
        </p>
      </div>

      {/* ───────────────── Right login card ───────────────── */}
      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-10">
        {/* Mobile-only background glow */}
        <div
          className="pointer-events-none absolute inset-0 bg-grid opacity-30 lg:hidden"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-radial-glow lg:hidden"
          aria-hidden
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lime glow-lime">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-lg font-semibold tracking-tight text-foreground">
                HayDev<span className="text-lime">OS</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                Enterprise Edition
              </p>
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-6 shadow-2xl sm:p-8">
            <div className="mb-6 space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {t("shell.login.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("shell.login.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground">
                  {t("shell.login.email")}
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="email"
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
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  {t("shell.login.password")}
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 border-border bg-muted/40 pl-9 text-sm"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* Org selector + language */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("shell.login.org")}
                  </Label>
                  <Select
                    value={activeOrgId}
                    onValueChange={(v) => setActiveOrg(v)}
                  >
                    <SelectTrigger className="h-10 bg-muted/40 text-sm">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_ORGS.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          <span className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[9px] font-bold text-lime">
                              {initials(o.name)}
                            </span>
                            {o.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("shell.user.language")}
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 justify-between gap-2 border-border bg-muted/40 px-3 text-sm font-normal text-foreground hover:bg-muted/60"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground/70" />
                          {LOCALE_LABELS[locale]}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[180px]">
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t("shell.user.language")}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {LOCALES.map((l) => (
                        <DropdownMenuItem
                          key={l}
                          onClick={() => setLocale(l as Locale)}
                          className="gap-2"
                        >
                          <span className="flex-1">{LOCALE_LABELS[l]}</span>
                          {locale === l && <Check className="h-3.5 w-3.5 text-lime" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

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
                      {t("shell.login.signingIn")}
                    </>
                  ) : (
                    <>
                      {t("shell.login.signin")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </span>
              </Button>

              <p className="pt-2 text-center text-[11px] text-muted-foreground/70">
                {t("shell.login.demoHint")}
              </p>
            </form>
          </div>

          <p className="mt-6 text-center text-[10px] uppercase tracking-wider text-muted-foreground/50">
            {t("shell.login.footer", { year })}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginScreen;
