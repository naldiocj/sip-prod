import type { RoleNode } from "./authorization-policy";

export type AuthUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  roleKeys: string[];
  roleTree: RoleNode[];
};

export type RefreshTokenInput = {
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type RefreshRotationInput = RefreshTokenInput & {
  previousTokenHash: string;
};

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  saveRefreshToken(input: RefreshTokenInput): Promise<void>;
  rotateRefreshToken(input: RefreshRotationInput): Promise<AuthUserRecord | null>;
  revokeRefreshSession(tokenHash: string): Promise<void>;
}