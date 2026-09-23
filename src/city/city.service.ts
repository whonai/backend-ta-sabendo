import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { EventDocument } from '../mongo/schemas/event.schema'
import { UrbanReportDocument } from '../mongo/schemas/urban-report.schema'

@Injectable()
export class CityService {
  constructor(
    @InjectModel('Event') private eventModel: Model<EventDocument>,
    @InjectModel('UrbanReport') private urModel: Model<UrbanReportDocument>
  ) {}

  async pulse() {
    const events = await this.eventModel.find().sort({ goingCount: -1 }).limit(5).lean()
    const reports = await this.urModel.find({ status: 'active' }).sort({ createdAt: -1 }).limit(5).lean()
    const activePeopleCount = events.reduce((s, e) => s + (e.goingCount || 0), 0) + reports.length

    const busiestNeighborhoods = await this.eventModel.aggregate([
      { $group: { _id: '$neighborhood', totalGoing: { $sum: '$goingCount' } } },
      { $sort: { totalGoing: -1 } },
      { $limit: 5 }
    ])

    return {
      activePeopleCount,
      busiestNeighborhoods,
      topEvents: events,
      recentAlerts: reports,
      broadcastBanner: null
    }
  }
}
