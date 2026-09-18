import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async metrics() {
    const totalEvents = await this.prisma.event.count()
    const pendingReports = await this.prisma.urbanReport.count({ where: { status: 'active' } })
    const flagged = await this.prisma.urbanReport.count({ where: { flagsCount: { gt: 0 } } })
    return { totalEvents, pendingReports, flagged }
  }

  async setBroadcast(message: string) {
    // For simplicity, store broadcast in a simple tableless mechanism: prisma.$executeRaw or a config table could be used.
    // We'll create a simple in-memory placeholder (not persisted) — TODO: persist in DB if needed.
    return { message }
  }
}
