import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type StreetSegmentDocument = StreetSegment & Document

@Schema({ timestamps: true })
export class StreetSegment {
  @Prop()
  name: string

  @Prop()
  neighborhood: string

  @Prop()
  status: string

  @Prop({ default: 0 })
  reportCount: number

  @Prop({ type: Object })
  coordinates: any
}

export const StreetSegmentSchema = SchemaFactory.createForClass(StreetSegment)
StreetSegmentSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})
