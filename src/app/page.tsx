/**
 * HayDevOS single-page entry. The database-backed session is resolved on the
 * server; the client receives only a minimal DTO.
 */

import { HayDevShell } from "@/components/shell/HayDevShell";
import { getOptionalAuthContext, toClientSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const context = await getOptionalAuthContext();
  return <HayDevShell initialSession={context ? toClientSession(context) : null} />;
}
