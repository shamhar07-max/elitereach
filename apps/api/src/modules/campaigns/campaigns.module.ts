import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { CampaignsService } from "./campaigns.service";
import { CampaignsController } from "./campaigns.controller";

@Module({
  imports: [AuthModule, AuditModule],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
