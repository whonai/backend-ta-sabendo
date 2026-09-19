import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type EventDocument = Event & Document

@Schema({ timestamps: true })
export class Event {
  @Prop()
  title: string

  @Prop()
  description: string

  @Prop()
  category: string

  @Prop()
  venueName: string

  @Prop()
  address: string

  @Prop()
  neighborhood: string

  @Prop(Number)
  latitude: number

  @Prop(Number)
  longitude: number

  @Prop()
  startTime: string

  @Prop()
  endTime: string

  @Prop()
  dayLabel: string

  @Prop()
  price: string

  @Prop()
  photoUrl: string

  @Prop({ default: true })
  isVerified: boolean

  @Prop({ default: 'platform' })
  origin: string

  @Prop({ default: 'scheduled' })
  status: string

  @Prop({ default: 0 })
  goingCount: number

  @Prop()
  createdById: string
}

export const EventSchema = SchemaFactory.createForClass(Event)
EventSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})
