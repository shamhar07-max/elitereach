import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "../auth/auth.module";
import { IntentExtractionService } from "../intent/intent-extraction.service";
import { ScoringService } from "../intent/scoring.service";
import { OpportunityClassifierService } from "../opportunities/opportunity-classifier.service";
import { JourneysModule } from "../journeys/journeys.module";
import { SignalsService, SIGNAL_QUEUE } from "./signals.service";
import { SignalsController } from "./signals.controller";
import { PipelineService } from "./pipeline.service";
import { PipelineProcessor } from "./pipeline.processor";

@Module({
  imports: [AuthModule, JourneysModule, BullModule.registerQueue({ name: SIGNAL_QUEUE })],
  providers: [SignalsService, PipelineService, PipelineProcessor, IntentExtractionService, ScoringService, OpportunityClassifierService],
  controllers: [SignalsController],
  exports: [SignalsService],
})
export class SignalsModule {}
