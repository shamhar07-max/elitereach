import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CrmSyncModule } from "../crm-sync/crm-sync.module";
import { OpportunitiesService } from "./opportunities.service";
import { OpportunitiesController } from "./opportunities.controller";

@Module({
  imports: [AuthModule, CrmSyncModule],
  providers: [OpportunitiesService],
  controllers: [OpportunitiesController],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
