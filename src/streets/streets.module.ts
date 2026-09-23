import { Module } from '@nestjs/common'
import { StreetsController } from './streets.controller'
import { StreetsService } from './streets.service'
import { MongooseModule } from '@nestjs/mongoose'
import { StreetSegment, StreetSegmentSchema } from '../mongo/schemas/street-segment.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: StreetSegment.name, schema: StreetSegmentSchema }])],
  controllers: [StreetsController],
  providers: [StreetsService]
})
export class StreetsModule {}
