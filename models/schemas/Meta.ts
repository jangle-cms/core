import { Schema } from 'mongoose'
import AuthorSignature from './Signature'

export default new Schema({
    version: {
      type: Number,
      min: 1,
      required: [ true, 'Version is required.' ]
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
