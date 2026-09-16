export type RoleNode = {
  id?: string;
  key: string;
  name?: string;
  parentId: string | null;
  permissions: string[];
  children?: RoleNode[];
};

export type UserRoleLike = {
  id?: string;
  key: string;
  permissions?: string[];
};

function buildRoleMap(roles: RoleNode[]) {
  const map = new Map<string, RoleNode>();

  const visit = (role: RoleNode) => {
    map.set(role.key, role);
    for (const child of role.children ?? []) {
      visit(child);
    }
  };

  for (const role of roles) {
    visit(role);
  }

  return map;
}

export function getEffectivePermissionsForRole(roleKey: string, roles: RoleNode[]): string[] {
  const map = buildRoleMap(roles);
  const target = map.get(roleKey);

  if (!target) {
    return [];
  }

  const seen = new Set<string>();
  const queue: RoleNode[] = [target];
  const result = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (seen.has(current.key)) {
      continue;
    }

    seen.add(current.key);

    for (const permission of current.permissions ?? []) {
      result.add(permission);
    }

    const children = current.children ?? [];
    for (const child of children) {
      if (!seen.has(child.key)) {
        queue.push(child);
      }
    }
  }

  return [...result];
}

export function permissionSetFromRoles(userRoles: UserRoleLike[], roles: RoleNode[]): string[] {
  const result = new Set<string>();

  for (const userRole of userRoles ?? []) {
    const effective = getEffectivePermissionsForRole(userRole.key, roles);

    for (const permission of effective) {
      result.add(permission);
    }

    for (const permission of userRole.permissions ?? []) {
      result.add(permission);
    }
  }

  return [...result];
}

export function getEffectivePermissionsForUser(userRoles: UserRoleLike[], roles: RoleNode[]): string[] {
  return permissionSetFromRoles(userRoles, roles);
}
