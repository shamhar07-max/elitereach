import { Controller, Get, Post, Param, ParseIntPipe, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ConnectorsService } from "./connectors.service";

@Controller("connectors")
@UseGuards(JwtAuthGuard)
export class ConnectorsController {
  constructor(private connectors: ConnectorsService) {}

  @Post("seed")
  seed(@Req() req: any) {
    return this.connectors.ensureSeeded(req.user.tenantId);
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
  checkOne(@Param("id", ParseIntPipe) id: number) {
    return this.connectors.checkHealth(id);
  }
}
