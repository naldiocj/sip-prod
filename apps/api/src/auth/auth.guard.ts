import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC_KEY } from "./public.decorator";

export type AuthenticatedUser = {
  sub: string;
  type: "access";
  email: string;
  roles: string[];
  permissions: string[];
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler?.();
    const targetClass = context.getClass?.();
    const targets = [handler, targetClass].filter(
      (value): value is (() => unknown) => typeof value === "function"
    );
    const isPublic = targets.length > 0
      ? this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)
      : false;

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string | undefined>; user?: AuthenticatedUser }>();
    const authHeader = request.headers?.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token de autenticação em falta.");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      if (payload.type !== "access") {
        throw new UnauthorizedException("Tipo de token inválido.");
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Token JWT inválido ou expirado.");
    }
  }
}
