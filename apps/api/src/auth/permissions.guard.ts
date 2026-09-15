import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { permissions?: string[] } }>();
    const user = request.user;

    if (!user || !Array.isArray(user.permissions)) {
      throw new UnauthorizedException("Permissões do utilizador não disponíveis.");
    }

    const permissionSet = new Set(user.permissions);
    const hasAllPermissions = requiredPermissions.every((permission) => permissionSet.has(permission));

    if (!hasAllPermissions) {
      throw new ForbiddenException("Utilizador sem permissão para esta operação.");
    }

    return true;
  }
}
