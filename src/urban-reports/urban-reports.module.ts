import { Module } from '@nestjs/common'
import { UrbanReportsService } from './urban-reports.service'
import { UrbanReportsController } from './urban-reports.controller'
import { PrismaService } from '../prisma/prisma.service'

@Module({
  controllers: [UrbanReportsController],
  providers: [UrbanReportsService, PrismaService]
})
export class UrbanReportsModule {}
