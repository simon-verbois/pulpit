/**
 * Client-side substring search + pagination over an already-fully-fetched
 * list - for the handful of Pulp content endpoints that expose no
 * `<field>__contains` filter at all server-side (VERIFIED live: Ansible
 * roles/collection versions, container tags, npm/gem/maven/Hugging Face
 * content, signing services - only exact-match `name`/`relative_path`
 * filters exist there), so a partial-text search box can't be built the
 * way every other list page in this app does (a server-side query param).
 * Fetches the whole list once (bounded to a large single page - realistic
 * for a self-hosted instance, see CLAUDE.md "Stay 100% local") and
 * filters/paginates it here instead.
 */
export function useClientSideSearch<T>(
  items: T[] | undefined,
  search: string,
  getSearchableText: (item: T) => string,
  pagination: { limit: number; offset: number },
): { paged: T[]; totalCount: number } {
  const all = items ?? [];
  const needle = search.trim().toLowerCase();
  const filtered = needle
    ? all.filter((item) => getSearchableText(item).toLowerCase().includes(needle))
    : all;
  const paged = filtered.slice(pagination.offset, pagination.offset + pagination.limit);
  return { paged, totalCount: filtered.length };
}
