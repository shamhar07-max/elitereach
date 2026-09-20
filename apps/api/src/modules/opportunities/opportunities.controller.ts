import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Roles } from "../auth/jwt-auth.guard";
import { OpportunitiesService } from "./opportunities.service";
import { CrmSyncService } from "../crm-sync/crm-sync.service";

const TRIAGE_ROLES = ["admin", "analyst", "reviewer"];
// Pushing to the real CRM is the "human qualifies" gate the client's own
// spec calls for — reserved for admin/reviewer, not the broader analyst
// role that also does routine triage (dismiss/feedback).
const CRM_PUSH_ROLES = ["admin", "reviewer"];

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
  @Roles(...TRIAGE_ROLES)
  dismiss(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.opportunities.dismiss(req.user.tenantId, id, req.user.sub);
  }

  @Post(":id/push-to-crm")
  @Roles(...CRM_PUSH_ROLES)
  pushToCrm(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.crmSync.pushToCrm(req.user.tenantId, id, req.user.sub);
  }

  @Post(":id/feedback")
  @Roles(...TRIAGE_ROLES)
  feedback(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Body("label") label: string) {
    return this.opportunities.recordFeedback(id, req.user.sub, label);
  }
}
