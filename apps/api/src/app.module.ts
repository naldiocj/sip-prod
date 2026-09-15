import { Controller, Get, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { Public } from "./auth/public.decorator";
import { DatabaseModule } from "./infrastructure/database/database.module";

@Controller()
class AppController {
  @Public()
  @Get("health")
  health() {
    return { status: "ok" };
  }
}

@Module({ imports: [DatabaseModule, AuthModule], controllers: [AppController] })
export class AppModule { }
