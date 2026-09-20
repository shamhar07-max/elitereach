import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { ConnectorsService } from "./connectors.service";
import { ConnectorsController } from "./connectors.controller";
import { ManualImportConnector } from "./manual-import.connector";
import { RedditConnector } from "./reddit.connector";
import { YoutubeConnector } from "./youtube.connector";

@Module({
  imports: [AuthModule, AuditModule],
  providers: [ConnectorsService, ManualImportConnector, RedditConnector, YoutubeConnector],
  controllers: [ConnectorsController],
  exports: [ConnectorsService],
})
export class ConnectorsModule {}
