import { notFound } from "next/navigation";
import { resolveWorkspaceRoute } from "@/lib/workspace-routes";

export default async function WorkspacePage({ params }: { params: Promise<{ workspace?: string[] }> }) {
  const { workspace } = await params;
  if (!resolveWorkspaceRoute(`/${(workspace ?? []).join("/")}`)) notFound();
  // The shared layout renders the URL's workspace and preserves its draft state.
  return null;
}
