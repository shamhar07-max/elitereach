import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { JourneysService } from "./journeys.service";
import { JourneysController } from "./journeys.controller";

@Module({
  imports: [AuthModule],
  providers: [JourneysService],
  controllers: [JourneysController],
  exports: [JourneysService],
})
export class JourneysModule {}
