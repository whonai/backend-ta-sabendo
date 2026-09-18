import { Controller, Get } from '@nestjs/common'
import { CityService } from './city.service'

@Controller('city')
export class CityController {
  constructor(private svc: CityService) {}

  @Get('pulse')
  pulse() {
    return this.svc.pulse()
  }
}
