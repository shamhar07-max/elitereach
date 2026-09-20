import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Roles } from "../auth/jwt-auth.guard";
import { CampaignsService, CreateCampaignDto } from "./campaigns.service";

const WRITE_ROLES = ["admin", "analyst", "reviewer"];

@Controller("campaigns")
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  @Get()
  list(@Req() req: any) {
    return this.campaigns.list(req.user.tenantId);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@Req() req: any, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(req.user.tenantId, req.user.sub, dto);
  }

  @Patch(":id/status")
  @Roles(...WRITE_ROLES)
  setStatus(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Body("status") status: string) {
    return this.campaigns.setStatus(req.user.tenantId, id, status);
  }
}
