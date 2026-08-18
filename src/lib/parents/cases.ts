export type ParentUserCase = "create" | "add_role" | "existing_parent";

export function classifyParentUserCase(
  existingUser: { memberships: { role: string; isActive?: boolean }[] } | null,
): ParentUserCase {
  if (!existingUser) return "create";
  const isParentHere = existingUser.memberships.some(
    (membership) => membership.role === "PARENT" && membership.isActive !== false,
  );
  return isParentHere ? "existing_parent" : "add_role";
}
