import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infrastructure/database/prisma.service";
import type { RoleNode } from "./authorization-policy";
import type {
  AuthRepository,
  AuthUserRecord,
  RefreshRotationInput,
  RefreshTokenInput
} from "./auth.repository";

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { roles: { include: { role: true } } }
    });

    if (!user) return null;

    const roles = await this.prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
    return this.toUserRecord(user, roles);
  }

  async saveRefreshToken(input: RefreshTokenInput): Promise<void> {
    await this.prisma.refreshToken.create({ data: input });
  }

  async rotateRefreshToken(input: RefreshRotationInput): Promise<AuthUserRecord | null> {
    const userId = await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.refreshToken.findUnique({
        where: { tokenHash: input.previousTokenHash }
      });

      if (!current || current.revokedAt || current.expiresAt.getTime() <= Date.now()) {
        if (current?.sessionId) {
          await transaction.refreshToken.updateMany({
            where: { sessionId: current.sessionId, revokedAt: null },
            data: { revokedAt: new Date() }
          });
        }
        return null;
      }

      if (current.userId !== input.userId || current.sessionId !== input.sessionId) return null;

      const updated = await transaction.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      if (updated.count !== 1) return null;

      const replacement = await transaction.refreshToken.create({
        data: {
          userId: input.userId,
          sessionId: input.sessionId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt
        }
      });

      await transaction.refreshToken.update({
        where: { id: current.id },
        data: { replacedByTokenId: replacement.id }
      });

      return current.userId;
    });

    return userId ? this.findUserById(userId) : null;
  }

  async revokeRefreshSession(tokenHash: string): Promise<void> {
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { sessionId: token.sessionId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  private async findUserById(id: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } }
    });

    if (!user) return null;

    const roles = await this.prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
    return this.toUserRecord(user, roles);
  }

  private toUserRecord(
    user: { id: string; email: string; passwordHash: string; roles: Array<{ role: { key: string } }> },
    roles: Array<{ id: string; key: string; name: string; parentId: string | null; permissions: Array<{ permission: { key: string } }> }>
  ): AuthUserRecord {
    const roleTree = this.toRoleTree(roles);
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      roleKeys: user.roles.map((assignment) => assignment.role.key),
      roleTree
    };
  }

  private toRoleTree(
    roles: Array<{ id: string; key: string; name: string; parentId: string | null; permissions: Array<{ permission: { key: string } }> }>
  ): RoleNode[] {
    const nodes = new Map<string, RoleNode>();

    for (const role of roles) {
      nodes.set(role.id, {
        id: role.id,
        key: role.key,
        name: role.name,
        parentId: role.parentId,
        permissions: role.permissions.map((entry) => entry.permission.key),
        children: []
      });
    }

    const roots: RoleNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children?.push(node);
      else roots.push(node);
    }

    return roots;
  }
}