import { getBooks } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { UnlockGate } from "@/components/UnlockGate";
import { BibliotecaClient } from "@/components/BibliotecaClient";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  if (!(await isAuthed())) return <UnlockGate />;
  const books = await getBooks();
  return <BibliotecaClient initialBooks={books} />;
}
