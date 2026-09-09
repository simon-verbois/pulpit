/**
 * Shared by every typeahead Select rendered inside one of this app's Modals
 * (GrantObjectAccessModal, AssignRoleModal, AddGroupMemberModal). Appending
 * the popper to document.body (the PatternFly default) makes Modal treat it
 * as outside content and permanently aria-hide it the next time the modal
 * re-renders. Appending inline (nested in the modal's own scrollable body)
 * dodges that, but then the popper's height counts toward that scroll
 * container's content and forces a spurious scrollbar on the whole modal.
 * Appending to the modal's backdrop instead keeps the popper a descendant of
 * the modal (still exempt from the aria-hide sweep) without nesting it
 * inside anything scrollable, so it floats exactly like the pre-fix,
 * document.body-appended version did. enableFlip is off too: these fields
 * are meant to always open downward (like every other dropdown/select in
 * the app) rather than flip upward whenever a modal leaves them little room
 * below.
 */
export const MODAL_TYPEAHEAD_POPPER_PROPS = {
  appendTo: () =>
    document.querySelector<HTMLElement>(".pf-v6-c-backdrop") ?? document.body,
  enableFlip: false,
};
