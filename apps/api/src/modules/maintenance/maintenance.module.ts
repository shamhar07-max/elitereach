import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MaintenanceService, MAINTENANCE_QUEUE } from "./maintenance.service";
import { DecayProcessor } from "./decay.processor";

@Module({
  imports: [BullModule.registerQueue({ name: MAINTENANCE_QUEUE })],
  providers: [MaintenanceService, DecayProcessor],
})
export class MaintenanceModule {}
