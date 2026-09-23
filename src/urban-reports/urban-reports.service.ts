import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UrbanReportDocument } from '../mongo/schemas/urban-report.schema'

@Injectable()
export class UrbanReportsService {
  constructor(@InjectModel('UrbanReport') private urModel: Model<UrbanReportDocument>) {}

  findAll() {
    return this.urModel.find({ status: 'active' }).lean()
  }

  create(data: any) {
    return this.urModel.create(data)
  }

  async confirm(id: string) {
    const r = await this.urModel.findById(id)
    if (!r) throw new NotFoundException('Report not found')
    r.upvotesCount = (r.upvotesCount || 0) + 1
    await r.save()
    return r.toJSON()
  }

  async flag(id: string) {
    const r = await this.urModel.findById(id)
    if (!r) throw new NotFoundException('Report not found')
    const flags = (r.flagsCount || 0) + 1
    const status = flags >= 5 ? 'investigating' : r.status
    r.flagsCount = flags
    r.status = status
    await r.save()
    return r.toJSON()
  }

  async setStatus(id: string, status: any) {
    const r = await this.urModel.findByIdAndUpdate(id, { status }, { new: true }).lean()
    return r
  }
}
