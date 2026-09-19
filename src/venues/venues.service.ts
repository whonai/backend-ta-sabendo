import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { VenueDocument } from '../mongo/schemas/venue.schema'

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

@Injectable()
export class VenuesService {
  constructor(@InjectModel('Venue') private venueModel: Model<VenueDocument>) {}

  async findNearby(lat?: number, lng?: number, radiusM = 1000) {
    const rows = await this.venueModel.find().lean()
    const mapped = rows.map((v: any) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      isVerified: v.isVerified,
      address: v.address,
      neighborhood: v.neighborhood,
      coordinates: { lat: v.latitude, lng: v.longitude },
      photoUrl: v.photoUrl ?? '',
      description: '',
      openingHours: '',
      activeEventsCount: 0,
    }))

    if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
      return mapped
    }

    return mapped
      .map((v) => ({
        ...v,
        distance: haversineMeters(lat, lng, v.coordinates.lat, v.coordinates.lng),
      }))
      .filter((v) => v.distance <= radiusM)
      .sort((a, b) => a.distance - b.distance)
      .map(({ distance, ...rest }) => rest)
  }
}
