import { Controller, Get, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { Public } from "./auth/public.decorator";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { ApplicationModule } from "./application/application.module";
import { ActoPiqueteModule } from "./interface/http/acto-piquete.module";

@Controller()
class AppController {
  @Public()
  @Get("health")
  health() {
    return { status: "ok" };
  }
}

@Module({ imports: [DatabaseModule, AuthModule, ApplicationModule, ActoPiqueteModule], controllers: [AppController] })
export class AppModule { }
