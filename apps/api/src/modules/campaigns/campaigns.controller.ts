import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CampaignsService, CreateCampaignDto } from "./campaigns.service";

@Controller("campaigns")
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  @Get()
  list(@Req() req: any) {
    return this.campaigns.list(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(req.user.tenantId, req.user.sub, dto);
  }

  @Patch(":id/status")
  setStatus(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Body("status") status: string) {
    return this.campaigns.setStatus(req.user.tenantId, id, status);
  }
}
