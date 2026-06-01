import { getActivities } from "@/lib/db";
import { ActivitiesManager } from "./ActivitiesManager";

export const dynamic = "force-dynamic";

export default function ActivitiesPage() {
  const all = getActivities(true);
  const active = all.filter((a) => !a.archived);
  const archived = all.filter((a) => a.archived);
  return <ActivitiesManager active={active} archived={archived} />;
}
