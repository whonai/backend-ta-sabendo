import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors({ origin: ['http://localhost:3000'] })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  const { AllExceptionsFilter } = await import('./common/filters/http-exception.filter')
  const { ResponseInterceptor } = await import('./common/interceptors/response.interceptor')
  app.useGlobalFilters(new AllExceptionsFilter())
  app.useGlobalInterceptors(new ResponseInterceptor())

  const config = new DocumentBuilder()
    .setTitle('Tá Rolando Feira API')
    .setDescription('API para mapa vivo e colaborativo')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT || 3001
  await app.listen(port)
  console.log(`Listening on port ${port}`)
}

bootstrap()
