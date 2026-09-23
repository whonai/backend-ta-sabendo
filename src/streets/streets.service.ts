import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { StreetSegmentDocument } from '../mongo/schemas/street-segment.schema'

@Injectable()
export class StreetsService {
  constructor(@InjectModel('StreetSegment') private ssModel: Model<StreetSegmentDocument>) {}

  async getMainAvenues() {
    const names = ['Av. Getúlio Vargas', 'Av. Fraga Maia', 'Av. Maria Quitéria', 'Av. João Durval Carneiro', 'Av. Nóide Cerqueira']
    return this.ssModel.find({ name: { $in: names } }).lean()
  }
}
