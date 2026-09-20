import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export const MAINTENANCE_QUEUE = "maintenance";
const DECAY_CHECK_INTERVAL_MS = 60_000; // demo-friendly interval; a real deployment might use 5-15 min

@Injectable()
export class MaintenanceService implements OnModuleInit {
  constructor(@InjectQueue(MAINTENANCE_QUEUE) private queue: Queue) {}

  async onModuleInit() {
    // Repeatable job id is deterministic, so re-registering it on every
    // boot (rather than accumulating a duplicate scheduler) is safe.
    await this.queue.upsertJobScheduler(
      "decay-check",
      { every: DECAY_CHECK_INTERVAL_MS },
      { name: "decay-check", data: {} },
    );
  }
}
