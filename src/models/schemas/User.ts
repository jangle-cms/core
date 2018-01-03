import { Schema } from 'mongoose'
import { roles } from '../../types'
import { hash } from '../../utils'

export type User = {
  email: string,
  password: string,
  role: string
}

export default (secret: string) => new Schema({
  email: {
    type: String,
    index: true,
    unique: true,
    required: [ true, 'Email is required.' ]
  },
  password: {
    type: String,
    required: [ true, 'Password is required.' ],
    select: false,
    set: hash(secret)
  },
  role: {
    type: String,
    enum: {
      values: roles,
      message: `Role should be one of: '${roles.join(`', '`)}'`
    },
    required: [ true, 'Role is required.' ]
  }
}, {
  collection: 'jangle.users',
  versionKey: false
})
