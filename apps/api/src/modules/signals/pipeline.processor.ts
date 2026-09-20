import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { SIGNAL_QUEUE } from "./signals.service";
import { PipelineService } from "./pipeline.service";

/* Real BullMQ worker (spec's "worker" app) — running in-process with the
 * API for Phase 1 rather than as a separately deployed service. This is a
 * legitimate, commonly-used topology (a BullMQ worker doesn't have to be a
 * separate process to be "real" background processing) and keeps
 * deployment simple until volume actually justifies splitting it out. */
@Processor(SIGNAL_QUEUE)
export class PipelineProcessor extends WorkerHost {
  private readonly logger = new Logger(PipelineProcessor.name);

  constructor(private pipeline: PipelineService) {
    super();
  }

  async process(job: Job<{ signalId: number }>) {
    const result = await this.pipeline.processSignal(job.data.signalId);
    this.logger.log(`processed signal ${job.data.signalId} -> ${result?.classification.opportunityType} (score ${result?.score.totalScore})`);
    return result;
  }
}
