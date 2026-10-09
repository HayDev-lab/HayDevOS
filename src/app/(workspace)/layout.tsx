import { HayDevShell } from "@/components/shell/HayDevShell";
import { getOptionalAuthContext, toClientSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const context = await getOptionalAuthContext();
  return <>{children}<HayDevShell initialSession={context ? toClientSession(context) : null} /></>;
}
