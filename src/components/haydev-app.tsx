"use client";
import { useState } from "react";
import { LanguageProvider } from "@/components/language-provider";
import { AppViewContext } from "@/components/app-view";
import HayDev from "@/components/haydev";
import { AuditApp } from "@/components/business-audit/audit-app";

/**
 * Single-route sandbox shell for the HayDev site. The original /:locale and
 * /:locale/audit URL routes are represented as in-page views, because the
 * sandbox only exposes the "/" route.
 */
export default function HayDevApp() {
  const [auditOpen, setAuditOpen] = useState(false);

  const openAudit = () => {
    setAuditOpen(true);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const closeAudit = (scrollTarget?: string) => {
    setAuditOpen(false);
    if (scrollTarget) {
      requestAnimationFrame(() =>
        document.getElementById(scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  return (
    <LanguageProvider>
      <AppViewContext.Provider value={{ auditOpen, openAudit, closeAudit }}>
        {auditOpen ? <AuditApp /> : <HayDev />}
      </AppViewContext.Provider>
    </LanguageProvider>
  );
}
