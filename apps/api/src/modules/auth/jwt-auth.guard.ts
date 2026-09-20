import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthedUser { sub: number; tenantId: number; role: string; email: string }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException("missing token");

    let payload: AuthedUser;
    try {
      payload = this.jwt.verify<AuthedUser>(header.slice(7));
    } catch {
      throw new UnauthorizedException("invalid or expired token");
    }
    req.user = payload;

    // Role check is deliberately outside the verify try/catch — a 403 for
    // "you're authenticated but not allowed" must never be reported back
    // as a 401 "your token is bad", which sends whoever's debugging it
    // chasing the wrong problem.
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, ctx.getHandler());
    if (requiredRoles?.length && payload.role !== "owner" && !requiredRoles.includes(payload.role)) {
      throw new ForbiddenException(`role "${payload.role}" cannot perform this action`);
    }
    return true;
  }
}
