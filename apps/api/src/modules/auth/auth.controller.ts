import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("register")
  register(@Body() body: { email: string; password: string; fullName: string; tenantName: string }) {
    return this.auth.register(body.email, body.password, body.fullName, body.tenantName);
  }

  @Post("login")
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }
}
