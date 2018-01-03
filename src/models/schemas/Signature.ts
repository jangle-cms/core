import { Schema, Types } from 'mongoose'

export default (label: string) : Schema => new Schema({
  by: {
    type: Types.ObjectId,
    ref: 'JangleUser',
    required: [ true, `Need user for '${label}'.` ]
  },
  at: {
    type: Date,
    required: [ true, `Need timestamp for '${label}'.` ],
    default: Date.now
  }
}, { _id: false })
