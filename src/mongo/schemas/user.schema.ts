import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserDocument = User & Document

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string

  @Prop({ required: true })
  password: string

  @Prop()
  name: string

  @Prop({ default: 'USER' })
  role: string

  @Prop({ default: 'Centro' })
  neighborhood: string

  @Prop({ type: [String], default: ['Morador de Feira'] })
  badges: string[]

  @Prop({ default: 50 })
  trustworthinessScore: number

  @Prop({ default: 0 })
  confirmationsGiven: number

  @Prop({ default: 0 })
  reportsSubmitted: number
}

export const UserSchema = SchemaFactory.createForClass(User)
UserSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})
