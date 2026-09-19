import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Event, EventSchema } from '../mongo/schemas/event.schema'
import { UrbanReport, UrbanReportSchema } from '../mongo/schemas/urban-report.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: UrbanReport.name, schema: UrbanReportSchema }
    ])
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
