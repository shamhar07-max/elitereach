import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api");
  const port = process.env.PORT || 4200;
  await app.listen(port);
  console.log(`Elite Reach API listening on :${port}`);
}
bootstrap();
