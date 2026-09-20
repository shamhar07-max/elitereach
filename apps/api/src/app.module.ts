import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DbModule } from "./db/db.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ConnectorsModule } from "./modules/connectors/connectors.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { SignalsModule } from "./modules/signals/signals.module";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module";
import { CrmSyncModule } from "./modules/crm-sync/crm-sync.module";

@Module({
  imports: [
    DbModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    AuthModule,
    ConnectorsModule,
    CampaignsModule,
    SignalsModule,
    OpportunitiesModule,
    CrmSyncModule,
  ],
})
export class AppModule {}
