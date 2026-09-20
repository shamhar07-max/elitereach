import { Inject, Injectable, ConflictException, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { eq, count } from "drizzle-orm";
import { DB } from "../../db/db.module";
import type { Db } from "../../db/client";
import { users, tenants } from "../../db/schema";

@Injectable()
export class AuthService {
  constructor(@Inject(DB) private db: Db, private jwt: JwtService) {}

  /** Self-registration only ever creates the first user (and its tenant) —
   * same bootstrap-then-lock pattern used in the Elite Escape OS platform,
   * for the same reason: an open register endpoint that can mint an owner
   * account at any time is a privilege-escalation hole. */
  async register(email: string, password: string, fullName: string, tenantName: string) {
    const [{ value: userCount }] = await this.db.select({ value: count() }).from(users);
    if (Number(userCount) > 0) {
      throw new ForbiddenException("self-registration is disabled — ask an admin to create your account");
    }

    const [tenant] = await this.db.insert(tenants).values({ name: tenantName }).returning();
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await this.db.insert(users).values({
      tenantId: tenant.id, email, passwordHash, fullName, role: "owner",
    }).returning();

    return this.issueToken(user);
  }

  async login(email: string, password: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("invalid credentials");
    }
    return this.issueToken(user);
  }

  private issueToken(user: typeof users.$inferSelect) {
    const payload = { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
    return {
      token: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, tenantId: user.tenantId },
    };
  }
}
