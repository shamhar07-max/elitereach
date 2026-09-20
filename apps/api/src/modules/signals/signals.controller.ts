import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Roles } from "../auth/jwt-auth.guard";
import { SignalsService } from "./signals.service";
import { RawSignalInput } from "../connectors/connector.interface";

const WRITE_ROLES = ["admin", "analyst", "reviewer"];

interface ImportBatchDto {
  connectorId: number;
  campaignId?: number;
  source: string;
  items: RawSignalInput[];
}

@Controller("signals")
@UseGuards(JwtAuthGuard)
export class SignalsController {
  constructor(private signals: SignalsService) {}

  @Post("import")
  @Roles(...WRITE_ROLES)
  importBatch(@Req() req: any, @Body() dto: ImportBatchDto) {
    return this.signals.ingestBatch(req.user.tenantId, dto.connectorId, dto.campaignId ?? null, dto.source, dto.items);
  }

  @Get()
  list(@Req() req: any, @Query("limit") limit?: string) {
    return this.signals.list(req.user.tenantId, limit ? parseInt(limit, 10) : 100);
  }

  @Get(":id")
  getOne(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.signals.getOne(req.user.tenantId, id);
  }
}
