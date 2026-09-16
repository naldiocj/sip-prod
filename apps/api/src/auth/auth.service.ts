import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { getEffectivePermissionsForRole } from "./authorization-policy";
import type { AuthRepository, AuthUserRecord } from "./auth.repository";
import { AUTH_REPOSITORY } from "./auth.tokens";

export type AuthUser = {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository
  ) { }

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.repository.findUserByEmail(email.trim());
    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const accessToken = await this.createAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, randomUUID());

    return {
      accessToken,
      refreshToken,
      user: this.toAuthUser(user)
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub?: string; type?: string; jti?: string; sessionId?: string };

    try {
      payload = await this.jwtService.verifyAsync<{ sub?: string; type?: string; jti?: string; sessionId?: string }>(refreshToken);
    } catch {
      throw new UnauthorizedException("Refresh token inválido ou expirado.");
    }

    if (payload.type !== "refresh" || !payload.sub || !payload.jti || !payload.sessionId) {
      throw new UnauthorizedException("Token de refresh inválido.");
    }

    const nextRefreshToken = await this.jwtService.signAsync(
      { sub: payload.sub, type: "refresh", jti: randomUUID(), sessionId: payload.sessionId },
      { expiresIn: "7d" }
    );
    const user = await this.repository.rotateRefreshToken({
      userId: payload.sub,
      sessionId: payload.sessionId,
      previousTokenHash: hashToken(refreshToken),
      tokenHash: hashToken(nextRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    });

    if (!user) {
      throw new UnauthorizedException("Refresh token foi revogado ou expirou.");
    }

    return {
      accessToken: await this.createAccessToken(user),
      refreshToken: nextRefreshToken
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.repository.revokeRefreshSession(hashToken(refreshToken));
  }

  static async hashPassword(password: string): Promise<string> {
    return hash(password, 12);
  }

  private async createAccessToken(user: AuthUserRecord): Promise<string> {
    return this.jwtService.signAsync({ ...this.toAuthUser(user), type: "access" }, { expiresIn: "15m" });
  }

  private async createRefreshToken(userId: string, sessionId: string): Promise<string> {
    const token = await this.jwtService.signAsync(
      { sub: userId, type: "refresh", jti: randomUUID(), sessionId },
      { expiresIn: "7d" }
    );

    await this.repository.saveRefreshToken({
      userId,
      sessionId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    });

    return token;
  }

  private toAuthUser(user: AuthUserRecord): AuthUser {
    const permissions = user.roleKeys.flatMap((roleKey) =>
      getEffectivePermissionsForRole(roleKey, user.roleTree)
    );

    return {
      sub: user.id,
      email: user.email,
      roles: user.roleKeys,
      permissions: [...new Set(permissions)]
    };
  }
}
