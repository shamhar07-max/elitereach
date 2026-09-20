import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JourneysService } from "./journeys.service";

@Controller("journeys")
@UseGuards(JwtAuthGuard)
export class JourneysController {
  constructor(private journeys: JourneysService) {}

  @Get()
  list(@Req() req: any) {
    return this.journeys.list(req.user.tenantId);
  }

  @Get(":id")
  getDetail(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.journeys.getDetail(req.user.tenantId, id);
  }
}
