import { useQuery } from "@tanstack/react-query";

import { getUserByUsername } from "../../../api/client/access/users";
import { userByUsernameKey } from "./queryKeys";

export function useUserByUsernameQuery(username: string) {
  return useQuery({
    queryKey: userByUsernameKey(username),
    queryFn: () => getUserByUsername(username),
  });
}
