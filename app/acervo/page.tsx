import { getPerfumes } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { UnlockGate } from "@/components/UnlockGate";
import { AcervoClient } from "@/components/AcervoClient";

export const dynamic = "force-dynamic";

export default async function AcervoPage() {
  if (!(await isAuthed())) return <UnlockGate />;
  const perfumes = await getPerfumes();
  return <AcervoClient initialPerfumes={perfumes} />;
}
