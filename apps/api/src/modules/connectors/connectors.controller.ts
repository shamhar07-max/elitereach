import { Controller, Get, Post, Param, ParseIntPipe, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard, Roles } from "../auth/jwt-auth.guard";
import { ConnectorsService } from "./connectors.service";

const WRITE_ROLES = ["admin", "analyst", "reviewer"]; // read_only excluded; owner always bypasses

@Controller("connectors")
@UseGuards(JwtAuthGuard)
export class ConnectorsController {
  constructor(private connectors: ConnectorsService) {}

  @Post("seed")
  @Roles(...WRITE_ROLES)
  seed(@Req() req: any) {
    return this.connectors.ensureSeeded(req.user.tenantId, req.user.sub);
  }

  @Get()
  list(@Req() req: any) {
    return this.connectors.list(req.user.tenantId);
  }

  @Get("health")
  health(@Req() req: any) {
    return this.connectors.listHealth(req.user.tenantId);
  }

  @Post(":id/health-check")
  @Roles(...WRITE_ROLES)
  checkOne(@Param("id", ParseIntPipe) id: number) {
    return this.connectors.checkHealth(id);
  }
}
