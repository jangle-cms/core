import { Schema } from 'mongoose'
import AuthorSignature from './Signature'
import { statuses } from '../../types'
const Types = Schema.Types

const Change = new Schema({
  field: {
    type: String,
    required: [ true, 'Each change needs a field name.' ]
  },
  oldValue: {
    type: Types.Mixed
  }
}, { _id: false })

export default new Schema({
  itemId: {
    type: Types.ObjectId,
    required: [ true, 'Item ID required to link back to item.' ],
    index: true
  },
  changes: {
    type: [ Change ]
  },
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
  updated: {
    type: AuthorSignature('updated'),
    required: [ true, 'Need to track item updates.' ]
  }
}, {
  versionKey: false
})
