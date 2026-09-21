import type { MockLead, MockLeadActivity } from "./types";

const ORG = "org_haydev";
const OWNER = "usr_owner";
const REP1 = "usr_rep1";
const REP2 = "usr_rep2";

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();
const hoursAhead = (h: number) => new Date(now + h * 3600000).toISOString();

export const mockLeads: MockLead[] = [
  {
    id: "ld_001", orgId: ORG, name: "Narine Ghazaryan", email: "n.gazaryan@vortex.am",
    phone: "+374 93 110 022", company: "Vortex Labs", source: "web", stage: "qualified",
    ownerId: REP1, value: 48000, currency: "USD",
    firstResponseAt: hoursAgo(20), lastActivityAt: hoursAgo(3),
    slaDueAt: hoursAhead(2), createdAt: daysAgo(6), updatedAt: hoursAgo(3),
  },
  {
    id: "ld_002", orgId: ORG, name: "Davit Markosyan", email: "davit@markosgroup.ru",
    phone: "+7 495 220 3344", company: "Markos Group", source: "referral", stage: "proposal",
    ownerId: REP2, value: 122000, currency: "USD",
    firstResponseAt: hoursAgo(40), lastActivityAt: hoursAgo(8),
    slaDueAt: hoursAhead(18), createdAt: daysAgo(10), updatedAt: hoursAgo(8),
  },
  {
    id: "ld_003", orgId: ORG, name: "Lilit Avetisyan", email: "lilit@brightpath.io",
    phone: "+1 415 555 0188", company: "BrightPath", source: "outbound", stage: "negotiation",
    ownerId: OWNER, value: 268000, currency: "USD",
    firstResponseAt: hoursAgo(72), lastActivityAt: hoursAgo(26),
    slaDueAt: hoursAhead(36), createdAt: daysAgo(18), updatedAt: hoursAgo(26),
  },
  {
    id: "ld_004", orgId: ORG, name: "Gevorg Minasyan", email: "gevorg@novaforge.dev",
    phone: "+374 77 902 113", company: "NovaForge", source: "event", stage: "new",
    ownerId: REP1, value: 18500, currency: "USD",
    firstResponseAt: null, lastActivityAt: hoursAgo(2),
    slaDueAt: hoursAhead(4), slaBreached: false, createdAt: hoursAgo(2), updatedAt: hoursAgo(2),
  },
  {
    id: "ld_005", orgId: ORG, name: "Anna Petrosyan", email: "anna@petrosltd.am",
    phone: "+374 55 667 889", company: "Petros Ltd", source: "inbound", stage: "contacted",
    ownerId: REP2, value: 32400, currency: "USD",
    firstResponseAt: hoursAgo(5), lastActivityAt: hoursAgo(5),
    slaDueAt: hoursAgo(1), slaBreached: true, createdAt: daysAgo(2), updatedAt: hoursAgo(5),
  },
  {
    id: "ld_006", orgId: ORG, name: "Tigran Sargsyan", email: "tigran@helixcorp.com",
    phone: "+1 212 555 0144", company: "Helix Corp", source: "partner", stage: "won",
    ownerId: OWNER, value: 410000, currency: "USD",
    firstResponseAt: daysAgo(30), lastActivityAt: daysAgo(1),
    slaDueAt: null, createdAt: daysAgo(34), updatedAt: daysAgo(1),
  },
  {
    id: "ld_007", orgId: ORG, name: "Maria Ivanova", email: "maria@stellarworks.ru",
    phone: "+7 812 445 7788", company: "Stellar Works", source: "web", stage: "qualified",
    ownerId: REP1, value: 76000, currency: "EUR",
    firstResponseAt: hoursAgo(28), lastActivityAt: hoursAgo(12),
    slaDueAt: hoursAhead(8), createdAt: daysAgo(5), updatedAt: hoursAgo(12),
  },
  {
    id: "ld_008", orgId: ORG, name: "Suren Harutyunyan", email: "suren@apexsys.io",
    phone: "+374 91 234 567", company: "Apex Systems", source: "outbound", stage: "lost",
    ownerId: REP2, value: 54000, currency: "USD",
    firstResponseAt: daysAgo(22), lastActivityAt: daysAgo(8),
    slaDueAt: null, createdAt: daysAgo(28), updatedAt: daysAgo(8),
  },
  {
    id: "ld_009", orgId: ORG, name: "Elena Sokolova", email: "elena@quantedge.eu",
    phone: "+44 20 7946 0958", company: "Quant Edge", source: "referral", stage: "proposal",
    ownerId: OWNER, value: 198000, currency: "EUR",
    firstResponseAt: hoursAgo(50), lastActivityAt: hoursAgo(16),
    slaDueAt: hoursAhead(24), createdAt: daysAgo(9), updatedAt: hoursAgo(16),
  },
  {
    id: "ld_010", orgId: ORG, name: "Vardan Khachatryan", email: "vardan@meridian.am",
    phone: "+374 60 555 100", company: "Meridian", source: "web", stage: "new",
    ownerId: REP1, value: 9200, currency: "USD",
    firstResponseAt: null, lastActivityAt: hoursAgo(1),
    slaDueAt: hoursAhead(3), createdAt: hoursAgo(1), updatedAt: hoursAgo(1),
  },
  {
    id: "ld_011", orgId: ORG, name: "Olga Petrova", email: "olga@brightlabs.ru",
    phone: "+7 495 100 2030", company: "Bright Labs", source: "event", stage: "contacted",
    ownerId: REP2, value: 42000, currency: "USD",
    firstResponseAt: hoursAgo(14), lastActivityAt: hoursAgo(6),
    slaDueAt: hoursAhead(10), createdAt: daysAgo(3), updatedAt: hoursAgo(6),
  },
  {
    id: "ld_012", orgId: ORG, name: "Arman Poghosyan", email: "arman@datavault.io",
    phone: "+1 650 555 0177", company: "DataVault", source: "inbound", stage: "won",
    ownerId: OWNER, value: 325000, currency: "USD",
    firstResponseAt: daysAgo(40), lastActivityAt: daysAgo(2),
    slaDueAt: null, createdAt: daysAgo(45), updatedAt: daysAgo(2),
  },
];

export const mockLeadActivities: MockLeadActivity[] = [
  { id: "la_001", leadId: "ld_001", orgId: ORG, type: "note", body: "Asked about enterprise SSO and data residency in EU.", createdAt: hoursAgo(3) },
  { id: "la_002", leadId: "ld_001", orgId: ORG, type: "email", body: "Sent pricing PDF + ROI calculator.", createdAt: hoursAgo(5) },
  { id: "la_003", leadId: "ld_001", orgId: ORG, type: "call", body: "Discovery call — 35 min. Champion is Head of Ops.", createdAt: hoursAgo(20) },
  { id: "la_004", leadId: "ld_002", orgId: ORG, type: "status_change", body: "Stage moved: contacted → proposal.", createdAt: hoursAgo(8) },
  { id: "la_005", leadId: "ld_002", orgId: ORG, type: "email", body: "Sent v2 quote with multi-year discount.", createdAt: hoursAgo(8) },
  { id: "la_006", leadId: "ld_003", orgId: ORG, type: "meeting", body: "On-site workshop scheduled for next Tuesday.", createdAt: hoursAgo(26) },
  { id: "la_007", leadId: "ld_005", orgId: ORG, type: "system", body: "SLA breach detected (response > 4h).", createdAt: hoursAgo(1) },
  { id: "la_008", leadId: "ld_006", orgId: ORG, type: "status_change", body: "Stage moved: negotiation → won. 🎉", createdAt: daysAgo(1) },
];
