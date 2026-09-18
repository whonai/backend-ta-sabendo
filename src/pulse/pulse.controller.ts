import { Controller, Get } from '@nestjs/common'
import { CityService } from '../city/city.service'

/** Alias for Express backend compatibility (`GET /api/pulse`). */
@Controller()
export class PulseAliasController {
  constructor(private city: CityService) {}

  @Get('pulse')
  pulse() {
    return this.city.pulse()
  }
}
