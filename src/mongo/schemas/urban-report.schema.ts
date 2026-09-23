import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UrbanReportDocument = UrbanReport & Document

@Schema({ timestamps: true })
export class UrbanReport {
  @Prop()
  type: string

  @Prop()
  title: string

  @Prop()
  description: string

  @Prop()
  streetName: string

  @Prop()
  neighborhood: string

  @Prop(Number)
  latitude: number

  @Prop(Number)
  longitude: number

  @Prop()
  photoUrl: string

  @Prop({ default: 'active' })
  status: string

  @Prop({ default: 1 })
  upvotesCount: number

  @Prop({ default: 0 })
  flagsCount: number

  @Prop()
  userId: string
}

export const UrbanReportSchema = SchemaFactory.createForClass(UrbanReport)
UrbanReportSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})
