import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TaxonomyService } from "./taxonomy.service";
import { TaxonomyController } from "./taxonomy.controller";

// forwardRef breaks the cycle: AuthService needs TaxonomyService (to seed a
// new tenant's default vocabulary on bootstrap registration), and
// TaxonomyController needs AuthModule's JwtAuthGuard.
@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [TaxonomyService],
  controllers: [TaxonomyController],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
