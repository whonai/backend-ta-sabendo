import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UrbanReportsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.urbanReport.findMany({ where: { status: 'active' } })
  }

  create(data: any) {
    return this.prisma.urbanReport.create({ data })
  }

  async confirm(id: string) {
    const r = await this.prisma.urbanReport.findUnique({ where: { id } })
    if (!r) throw new NotFoundException('Report not found')
    return this.prisma.urbanReport.update({ where: { id }, data: { upvotesCount: r.upvotesCount + 1 } })
  }

  async flag(id: string) {
    const r = await this.prisma.urbanReport.findUnique({ where: { id } })
    if (!r) throw new NotFoundException('Report not found')
    const flags = r.flagsCount + 1
    // If flags exceed threshold, set status to investigating
    const status = (flags >= 5 ? 'investigating' : r.status) as any
    return this.prisma.urbanReport.update({ where: { id }, data: { flagsCount: flags, status } })
  }

  async setStatus(id: string, status: any) {
    return this.prisma.urbanReport.update({ where: { id }, data: { status } })
  }
}
