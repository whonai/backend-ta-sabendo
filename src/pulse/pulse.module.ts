import { Module } from '@nestjs/common'
import { PulseAliasController } from './pulse.controller'
import { CityService } from '../city/city.service'

@Module({
  controllers: [PulseAliasController],
  providers: [CityService],
})
export class PulseModule {}
