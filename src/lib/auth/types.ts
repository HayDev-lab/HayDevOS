export const TENANT_ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

export interface ClientOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: TenantRole;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  role: TenantRole;
  avatarUrl: string;
}

export interface ClientSession {
  user: ClientUser;
  activeOrganization: ClientOrganization;
  organizations: ClientOrganization[];
  expiresAt: string;
}

