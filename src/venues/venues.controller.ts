import { Controller, Get, Query } from '@nestjs/common'
import { VenuesService } from './venues.service'

@Controller('venues')
export class VenuesController {
  constructor(private svc: VenuesService) {}

  @Get()
  list(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string
  ) {
    const parsedLat = lat !== undefined ? parseFloat(lat) : undefined
    const parsedLng = lng !== undefined ? parseFloat(lng) : undefined
    const parsedRadius = radius !== undefined ? parseFloat(radius) : 1000
    return this.svc.findNearby(parsedLat, parsedLng, Number.isNaN(parsedRadius) ? 1000 : parsedRadius)
  }
}
