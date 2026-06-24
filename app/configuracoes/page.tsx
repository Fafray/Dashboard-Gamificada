import { getPortraitOverrides } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { UnlockGate } from "@/components/UnlockGate";
import { ConfiguracoesClient } from "@/components/ConfiguracoesClient";
import { PORTRAITS } from "@/lib/portraits";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  if (!(await isAuthed())) return <UnlockGate />;
  const overrides = await getPortraitOverrides();
  return <ConfiguracoesClient portraits={PORTRAITS} overrides={overrides} />;
}
