import { Schema } from 'mongoose'
import { statuses } from '../../types'
import AuthorSignature from './Signature'

export default new Schema({
    version: {
      type: Number,
      min: 1,
      required: [ true, 'Version is required.' ]
    },
    status: {
      type: String,
      required: [ true, 'Status is required.' ],
      enum: {
        values: statuses,
        message: `Status should be one of: '${statuses.join(`', '`)}'`
      }
    },
    created: {
      type: AuthorSignature('created'),
      required: [ true, 'Need to track item creation.' ]
    },
    updated: {
      type: AuthorSignature('updated'),
      required: [ true, 'Need to track item updates.' ]
    }
  }, {
    _id: false,
    versionKey: false
  })
