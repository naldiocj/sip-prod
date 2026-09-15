import { describe, expect, it } from "vitest";
import {
  getEffectivePermissionsForRole,
  getEffectivePermissionsForUser,
  permissionSetFromRoles,
  type RoleNode
} from "./authorization-policy";

describe("authorization policy", () => {
  const roles: RoleNode[] = [
    {
      id: "role-1",
      key: "diretor_nacional",
      name: "Diretor Nacional",
      parentId: null,
      permissions: ["processo:read", "processo:write", "relatorio:export"],
      children: [
        {
          id: "role-2",
          key: "chefe_departamento",
          name: "Chefe de Departamento",
          parentId: "role-1",
          permissions: ["processo:read", "despacho:write"],
          children: [
            {
              id: "role-3",
              key: "instrutor",
              name: "Instrutor",
              parentId: "role-2",
              permissions: ["peca:sign"],
              children: []
            }
          ]
        }
      ]
    }
  ];

  it("herda permissões dos níveis inferiores", () => {
    expect(getEffectivePermissionsForRole("diretor_nacional", roles)).toEqual(
      expect.arrayContaining(["processo:read", "despacho:write", "peca:sign"])
    );
  });

  it("combina permissões de múltiplos perfis sem duplicados", () => {
    const userRoles = [
      { key: "diretor_nacional", permissions: ["processo:read"] },
      { key: "instrutor", permissions: ["peca:sign", "processo:read"] }
    ];

    expect(permissionSetFromRoles(userRoles, roles)).toEqual(
      expect.arrayContaining(["processo:read", "peca:sign"])
    );
    expect(permissionSetFromRoles(userRoles, roles)).toHaveLength(5);
  });

  it("calcula permissões efetivas do utilizador a partir dos perfis atribuídos", () => {
    const userRoles = [
      {
        id: "ur-1",
        key: "diretor_nacional",
        permissions: ["processo:read"]
      },
      {
        id: "ur-2",
        key: "oficial_secretaria",
        permissions: ["peca:write"]
      }
    ];

    expect(getEffectivePermissionsForUser(userRoles, roles)).toEqual(
      expect.arrayContaining(["processo:read", "peca:write"])
    );
  });
});
