import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { getEffectivePermissionsForRole, type RoleNode } from "./authorization-policy";

export type AuthUser = {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
};

const ROLE_TREE: RoleNode[] = [
  {
    id: "r-diretor-geral",
    key: "diretor_geral",
    name: "Diretor Geral",
    parentId: null,
    permissions: ["processo:read", "processo:write", "despacho:write", "relatorio:export"],
    children: [
      {
        id: "r-diretor-nacional",
        key: "diretor_nacional",
        name: "Diretor Nacional",
        parentId: "r-diretor-geral",
        permissions: ["processo:read", "processo:write", "relatorio:export"],
        children: [
          {
            id: "r-chefe-departamento",
            key: "chefe_departamento",
            name: "Chefe de Departamento",
            parentId: "r-diretor-nacional",
            permissions: ["processo:read", "despacho:write"],
            children: [
              {
                id: "r-chefe-seccao",
                key: "chefe_seccao",
                name: "Chefe de Secção",
                parentId: "r-chefe-departamento",
                permissions: ["processo:read", "processo:write"],
                children: [
                  {
                    id: "r-instrutor",
                    key: "instrutor",
                    name: "Instrutor",
                    parentId: "r-chefe-seccao",
                    permissions: ["peca:sign", "processo:review"],
                    children: []
                  },
                  {
                    id: "r-agente-piquete",
                    key: "agente_piquete",
                    name: "Agente de Piquete",
                    parentId: "r-chefe-seccao",
                    permissions: ["acto:register", "processo:read"],
                    children: []
                  }
                ]
              },
              {
                id: "r-oficial-secretaria",
                key: "oficial_secretaria",
                name: "Oficial de Secretaria",
                parentId: "r-chefe-departamento",
                permissions: ["entrada_pgr:register", "peca:write"],
                children: []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "r-procurador",
    key: "procurador",
    name: "Procurador",
    parentId: null,
    permissions: ["processo:read", "despacho:write", "relatorio:export"],
    children: []
  }
];

const USERS: Array<{ id: string; email: string; passwordHash: string; roles: string[] }> = [
  {
    id: "u-diretor-nacional",
    email: "diretor.nacional@sip.local",
    passwordHash: "$2a$10$6/0UQ3fQz3qM4jE3uYwzOeW0g2Hu6v2O3nLj9a1oj2L2fE7l6U5uK",
    roles: ["diretor_nacional"]
  },
  {
    id: "u-instrutor",
    email: "instrutor@sip.local",
    passwordHash: "$2a$10$6/0UQ3fQz3qM4jE3uYwzOeW0g2Hu6v2O3nLj9a1oj2L2fE7l6U5uK",
    roles: ["instrutor"]
  }
];

const REFRESH_TOKENS = new Map<string, { userId: string; expiresAt: number; revokedAt?: number }>();

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) { }

  async login(email: string, password: string): Promise<LoginResponse> {
    const foundUser = USERS.find((user) => user.email.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const isValid = await compare(password, foundUser.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const roles = foundUser.roles;
    const permissions = roles.flatMap((roleKey) => getEffectivePermissionsForRole(roleKey, ROLE_TREE));
    const uniquePermissions = [...new Set(permissions)];

    const payload: AuthUser = {
      id: foundUser.id,
      email: foundUser.email,
      roles,
      permissions: uniquePermissions
    };

    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: "15m" });
    const refreshTokenValue = await this.jwtService.signAsync(
      { sub: foundUser.id, type: "refresh", jti: randomUUID() },
      { expiresIn: "7d" }
    );

    const refreshTokenHash = hashToken(refreshTokenValue);
    REFRESH_TOKENS.set(refreshTokenHash, {
      userId: foundUser.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: payload
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string; type?: string; jti?: string };

    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; type?: string; jti?: string }>(refreshToken);
    } catch {
      throw new UnauthorizedException("Refresh token inválido ou expirado.");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Token de refresh inválido.");
    }

    const tokenHash = hashToken(refreshToken);
    const record = REFRESH_TOKENS.get(tokenHash);

    if (!record || record.revokedAt || record.expiresAt < Date.now()) {
      throw new UnauthorizedException("Refresh token foi revogado ou expirou.");
    }

    const user = USERS.find((entry) => entry.id === payload.sub);

    if (!user) {
      throw new UnauthorizedException("Utilizador não encontrado.");
    }

    const nextRefreshTokenValue = await this.jwtService.signAsync(
      { sub: user.id, type: "refresh", jti: randomUUID() },
      { expiresIn: "7d" }
    );

    const nextHash = hashToken(nextRefreshTokenValue);
    REFRESH_TOKENS.set(nextHash, {
      userId: user.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    });
    REFRESH_TOKENS.delete(tokenHash);

    const permissions = user.roles.flatMap((roleKey) => getEffectivePermissionsForRole(roleKey, ROLE_TREE));
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        permissions: [...new Set(permissions)]
      },
      { expiresIn: "15m" }
    );

    return {
      accessToken,
      refreshToken: nextRefreshTokenValue
    };
  }

  static getRoleTree(): RoleNode[] {
    return ROLE_TREE;
  }

  static async hashPassword(password: string) {
    return hash(password, 10);
  }
}
