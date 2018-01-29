import { Schema } from 'mongoose'
import { roles } from '../../types'
import { encrypt } from '../../utils'

export type User = {
  email: string,
  password: string,
  role: string
}

const encryptField = (fieldName: string) =>
  function (next : Function) {
    encrypt(this[fieldName])
      .then(hash => {
        this[fieldName] = hash
        next()
      })
      .catch(reason => next(reason))
  }

const User = new Schema({
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
    set: encrypt
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

User.pre('save', encryptField('password'))

export default User
