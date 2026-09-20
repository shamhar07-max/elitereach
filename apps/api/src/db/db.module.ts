import { Global, Module } from "@nestjs/common";
import { db } from "./client";

export const DB = "DB";

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class DbModule {}
