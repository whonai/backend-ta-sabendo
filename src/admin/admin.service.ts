import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EventDocument } from '../mongo/schemas/event.schema'
import { UrbanReportDocument } from '../mongo/schemas/urban-report.schema'

@Injectable()
export class AdminService {
  constructor(
    @InjectModel('Event') private eventModel: Model<EventDocument>,
    @InjectModel('UrbanReport') private urModel: Model<UrbanReportDocument>
  ) {}

  async metrics() {
    const totalEvents = await this.eventModel.countDocuments()
    const pendingReports = await this.urModel.countDocuments({ status: 'active' })
    const flagged = await this.urModel.countDocuments({ flagsCount: { $gt: 0 } })
    return { totalEvents, pendingReports, flagged }
  }

  async setBroadcast(message: string) {
    return { message }
  }
}
