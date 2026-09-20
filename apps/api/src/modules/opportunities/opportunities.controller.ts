import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OpportunitiesService } from "./opportunities.service";
import { CrmSyncService } from "../crm-sync/crm-sync.service";

@Controller("opportunities")
@UseGuards(JwtAuthGuard)
export class OpportunitiesController {
  constructor(private opportunities: OpportunitiesService, private crmSync: CrmSyncService) {}

  @Get()
  list(@Req() req: any, @Query("status") status?: string) {
    return this.opportunities.list(req.user.tenantId, status);
  }

  @Get(":id")
  getDetail(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.opportunities.getDetail(req.user.tenantId, id);
  }

  @Patch(":id/dismiss")
  dismiss(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.opportunities.dismiss(req.user.tenantId, id, req.user.sub);
  }

  @Post(":id/push-to-crm")
  pushToCrm(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.crmSync.pushToCrm(req.user.tenantId, id, req.user.sub);
  }

  @Post(":id/feedback")
  feedback(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Body("label") label: string) {
    return this.opportunities.recordFeedback(id, req.user.sub, label);
  }
}
