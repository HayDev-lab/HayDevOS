"use client";
import { useState } from "react";
import { LanguageProvider } from "@/components/language-provider";
import { AppViewContext } from "@/components/app-view";
import HayDev from "@/components/haydev";
import { AuditApp } from "@/components/business-audit/audit-app";
import { LeadOSAppEntry } from "@/components/leados/leados-app-entry";

/**
 * Single-route sandbox shell for the HayDev site. The original /:locale,
 * /:locale/audit and /products/leados/demo URL routes are represented as
 * in-page views, because the sandbox only exposes the "/" route.
 */
export default function HayDevApp() {
  const [auditOpen, setAuditOpen] = useState(false);
  const [leadosOpen, setLeadosOpen] = useState(false);

  const openAudit = () => {
    setLeadosOpen(false);
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

  const openLeados = () => {
    setAuditOpen(false);
    setLeadosOpen(true);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const closeLeados = (scrollTarget?: string) => {
    setLeadosOpen(false);
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
      <AppViewContext.Provider
        value={{ auditOpen, openAudit, closeAudit, leadosOpen, openLeados, closeLeados }}
      >
        {auditOpen ? <AuditApp /> : leadosOpen ? <LeadOSAppEntry /> : <HayDev />}
      </AppViewContext.Provider>
    </LanguageProvider>
  );
}
