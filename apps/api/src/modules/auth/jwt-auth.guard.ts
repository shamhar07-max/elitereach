import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, SetMetadata } from "@nestjs/common";
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

    try {
      const payload = this.jwt.verify<AuthedUser>(header.slice(7));
      req.user = payload;

      const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, ctx.getHandler());
      if (requiredRoles?.length && payload.role !== "owner" && !requiredRoles.includes(payload.role)) {
        throw new UnauthorizedException("insufficient role");
      }
      return true;
    } catch {
      throw new UnauthorizedException("invalid or expired token");
    }
  }
}
