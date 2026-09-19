import { Module } from '@nestjs/common'
import { UrbanReportsService } from './urban-reports.service'
import { UrbanReportsController } from './urban-reports.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { UrbanReport, UrbanReportSchema } from '../mongo/schemas/urban-report.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: UrbanReport.name, schema: UrbanReportSchema }])],
  controllers: [UrbanReportsController],
  providers: [UrbanReportsService]
})
export class UrbanReportsModule {}
