import { getBooks, getPerfumes } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { UnlockGate } from "@/components/UnlockGate";
import { ColecoesClient } from "@/components/ColecoesClient";

export const dynamic = "force-dynamic";

export default async function ColecoesPage() {
  if (!(await isAuthed())) return <UnlockGate />;
  const [books, perfumes] = await Promise.all([getBooks(), getPerfumes()]);
  return <ColecoesClient initialBooks={books} initialPerfumes={perfumes} />;
}
