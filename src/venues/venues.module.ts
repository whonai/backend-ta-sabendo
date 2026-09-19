import { Module } from '@nestjs/common'
import { VenuesController } from './venues.controller'
import { VenuesService } from './venues.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Venue, VenueSchema } from '../mongo/schemas/venue.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: Venue.name, schema: VenueSchema }])],
  controllers: [VenuesController],
  providers: [VenuesService],
})
export class VenuesModule {}
