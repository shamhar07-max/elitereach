import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Roles } from "../auth/jwt-auth.guard";
import { TaxonomyService } from "./taxonomy.service";

const WRITE_ROLES = ["admin", "analyst", "reviewer"];

@Controller("taxonomy-terms")
@UseGuards(JwtAuthGuard)
export class TaxonomyController {
  constructor(private taxonomy: TaxonomyService) {}

  @Get()
  list(@Req() req: any) {
    return this.taxonomy.list(req.user.tenantId);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  add(@Req() req: any, @Body() body: { category: string; term: string; canonicalValue?: string }) {
    return this.taxonomy.addTerm(req.user.tenantId, body.category, body.term, body.canonicalValue);
  }

  @Delete(":id")
  @Roles(...WRITE_ROLES)
  remove(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.taxonomy.removeTerm(req.user.tenantId, id);
  }
}
