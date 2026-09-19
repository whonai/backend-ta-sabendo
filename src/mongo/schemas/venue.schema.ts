import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type VenueDocument = Venue & Document

@Schema({ timestamps: true })
export class Venue {
  @Prop()
  name: string

  @Prop()
  neighborhood: string

  @Prop()
  address: string

  @Prop()
  category: string

  @Prop(Number)
  latitude: number

  @Prop(Number)
  longitude: number

  @Prop()
  photoUrl: string

  @Prop({ default: true })
  isVerified: boolean
}

export const VenueSchema = SchemaFactory.createForClass(Venue)
VenueSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})
