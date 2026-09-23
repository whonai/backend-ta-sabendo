import { Module } from '@nestjs/common'
import { PulseAliasController } from './pulse.controller'
import { CityModule } from '../city/city.module'

@Module({
  imports: [CityModule],
  controllers: [PulseAliasController]
})
export class PulseModule {}
