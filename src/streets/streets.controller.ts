import { Controller, Get } from '@nestjs/common'
import { StreetsService } from './streets.service'

@Controller('streets')
export class StreetsController {
  constructor(private svc: StreetsService) {}

  @Get()
  getMain() {
    return this.svc.getMainAvenues()
  }
}
