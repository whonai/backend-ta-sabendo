import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CityService {
  constructor(private prisma: PrismaService) {}

  async pulse() {
    const events = await this.prisma.event.findMany({ orderBy: { goingCount: 'desc' }, take: 5 })
    const reports = await this.prisma.urbanReport.findMany({ where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 5 })
    const activePeopleCount = events.reduce((s, e) => s + e.goingCount, 0) + reports.length
    const busiestNeighborhoods = await this.prisma.event.groupBy({ by: ['neighborhood'], _sum: { goingCount: true }, orderBy: { _sum: { goingCount: 'desc' } }, take: 5 })

    return {
      activePeopleCount,
      busiestNeighborhoods,
      topEvents: events,
      recentAlerts: reports,
      broadcastBanner: null
    }
  }
}
