import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { hashSync } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { AuthGuard } from "./auth.guard";
import type { AuthRepository, AuthUserRecord, RefreshRotationInput, RefreshTokenInput } from "./auth.repository";
import { AuthService } from "./auth.service";
import {
  getEffectivePermissionsForRole,
  getEffectivePermissionsForUser,
  permissionSetFromRoles,
  type RoleNode
} from "./authorization-policy";
import { PermissionsGuard } from "./permissions.guard";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator";

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

describe("authentication flow", () => {
  const jwtService = new JwtService({ secret: "test-secret" });
  const user: AuthUserRecord = {
    id: "u-diretor-nacional",
    email: "diretor.nacional@sip.local",
    passwordHash: hashSync("Teste@123", 4),
    roleKeys: ["diretor_nacional"],
    roleTree: [
      {
        key: "diretor_nacional",
        parentId: null,
        permissions: ["processo:read"],
        children: [
          {
            key: "instrutor",
            parentId: "diretor-nacional",
            permissions: ["peca:sign"],
            children: []
          }
        ]
      }
    ]
  };
  const refreshTokens = new Set<string>();
  const authRepository: AuthRepository = {
    async findUserByEmail(email: string) {
      return email.toLowerCase() === user.email ? user : null;
    },
    async saveRefreshToken(input: RefreshTokenInput) {
      refreshTokens.add(input.tokenHash);
    },
    async rotateRefreshToken(input: RefreshRotationInput) {
      if (!refreshTokens.delete(input.previousTokenHash)) return null;
      refreshTokens.add(input.tokenHash);
      return input.userId === user.id ? user : null;
    },
    async revokeRefreshSession(tokenHash: string) {
      refreshTokens.delete(tokenHash);
    }
  };
  const authService = new AuthService(jwtService, authRepository);

  it("rejeita login inválido", async () => {
    await expect(authService.login("nao.existe@sip.local", "wrong-password")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("rejeita token expirado", async () => {
    const guard = new AuthGuard(
      {
        verifyAsync: async () => {
          throw new UnauthorizedException("Token JWT inválido ou expirado.");
        }
      } as unknown as JwtService,
      new Reflector()
    );

    const request = {
      headers: { authorization: "Bearer expired-token" }
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request
      }),
      getHandler: () => undefined,
      getClass: () => class TestController { }
    };

    const promise = guard.canActivate(context as never);
    promise.catch((error) => {
      console.log("EXPIRED_TOKEN_DEBUG", error?.constructor?.name, error?.message, error?.stack);
    });

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rotaciona refresh token e rejeita reutilização do antigo", async () => {
    const initial = await authService.login("diretor.nacional@sip.local", "Teste@123");
    const rotated = await authService.refresh(initial.refreshToken);

    expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    await expect(authService.refresh(initial.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("emite sub e permissões herdadas no access token", async () => {
    const response = await authService.login("diretor.nacional@sip.local", "Teste@123");
    const payload = await jwtService.verifyAsync<{ sub: string; type: string; permissions: string[] }>(response.accessToken);

    expect(payload.sub).toBe(user.id);
    expect(payload.type).toBe("access");
    expect(payload.permissions).toEqual(expect.arrayContaining(["peca:sign"]));
  });

  it("revoga a sessão no logout", async () => {
    const response = await authService.login("diretor.nacional@sip.local", "Teste@123");
    await authService.logout(response.refreshToken);
    await expect(authService.refresh(response.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita acesso sem permissão", () => {
    const guard = new PermissionsGuard(new Reflector());
    const target = class TestController { };
    Reflect.defineMetadata(REQUIRED_PERMISSIONS_KEY, ["processo:write"], target);

    const request = {
      user: { permissions: ["processo:read"] }
    };

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => target,
      getClass: () => target
    };

    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException);
  });
});
