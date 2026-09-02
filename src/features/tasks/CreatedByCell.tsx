import { useUserQuery } from "../access/users/useUserQuery";

/** Resolves a task's `created_by` href into a username, falling back to the
 * raw href while loading or on error rather than showing nothing. */
export function CreatedByCell({ createdBy }: { createdBy?: string | null }) {
  const userQuery = useUserQuery(createdBy);

  if (!createdBy) {
    return <>System</>;
  }
  return <>{userQuery.data?.username ?? createdBy}</>;
}
