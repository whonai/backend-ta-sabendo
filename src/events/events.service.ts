import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EventDocument } from '../mongo/schemas/event.schema'

@Injectable()
export class EventsService {
  constructor(@InjectModel('Event') private eventModel: Model<EventDocument>) {}

  findAll(filters: any = {}) {
    const where: any = {}
    if (filters.category) where.category = filters.category
    if (filters.neighborhood) where.neighborhood = filters.neighborhood
    if (filters.dayLabel) where.dayLabel = filters.dayLabel
    return this.eventModel.find(where).lean()
  }

  async findOne(id: string) {
    const event = await this.eventModel.findById(id).lean()
    if (!event) throw new NotFoundException('Event not found')
    return event
  }

  create(data: any) {
    return this.eventModel.create(data)
  }

  update(id: string, data: any) {
    return this.eventModel.findByIdAndUpdate(id, data, { new: true }).lean()
  }

  remove(id: string) {
    return this.eventModel.findByIdAndDelete(id).lean()
  }

  async rsvp(id: string, userId: string) {
    const event = await this.eventModel.findById(id)
    if (!event) throw new NotFoundException('Event not found')
    event.goingCount = (event.goingCount || 0) + 1
    await event.save()
    return event.toJSON()
  }
}
