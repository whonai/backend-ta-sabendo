import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: any = {}) {
    const where: any = {}
    if (filters.category) where.category = filters.category
    if (filters.neighborhood) where.neighborhood = filters.neighborhood
    if (filters.dayLabel) where.dayLabel = filters.dayLabel
    return this.prisma.event.findMany({ where })
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } })
    if (!event) throw new NotFoundException('Event not found')
    return event
  }

  create(data: any) {
    return this.prisma.event.create({ data })
  }

  update(id: string, data: any) {
    return this.prisma.event.update({ where: { id }, data })
  }

  remove(id: string) {
    return this.prisma.event.delete({ where: { id } })
  }

  async rsvp(id: string, userId: string) {
    const event = await this.findOne(id)
    const going = event.goingCount + 1
    return this.prisma.event.update({ where: { id }, data: { goingCount: going } })
  }
}
