import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "../infrastructure/database/database.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AUTH_REPOSITORY } from "./auth.tokens";
import { AuthService } from "./auth.service";
import { PrismaAuthRepository } from "./prisma-auth.repository";
import { PermissionsGuard } from "./permissions.guard";

const jwtSecret = process.env.JWT_SECRET ?? (
  process.env.NODE_ENV === "production" ? undefined : "development-only-secret"
);

if (!jwtSecret) {
  throw new Error("JWT_SECRET é obrigatório em produção.");
}

@Global()
@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: "15m" }
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: AUTH_REPOSITORY, useClass: PrismaAuthRepository },
    AuthGuard,
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ],
  exports: [JwtModule, AuthService, AuthGuard, PermissionsGuard]
})
export class AuthModule { }
