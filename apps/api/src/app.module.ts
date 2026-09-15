import { Controller, Get, Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module";

@Controller()
class AppController {
  @Get("health")
  health() {
    return { status: "ok" };
  }
}

@Module({ imports: [DatabaseModule], controllers: [AppController] })
export class AppModule {}
