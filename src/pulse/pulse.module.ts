import { Module } from '@nestjs/common'
import { PulseAliasController } from './pulse.controller'
import { CityService } from '../city/city.service'
import { PrismaService } from '../prisma/prisma.service'

@Module({
  controllers: [PulseAliasController],
  providers: [CityService, PrismaService],
})
export class PulseModule {}
