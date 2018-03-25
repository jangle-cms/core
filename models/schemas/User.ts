import { Schema } from 'mongoose'
import { roles } from '../../types'
import { encrypt, debug } from '../../utils'

export type User = {
  email: string,
  password: string,
  role: string
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
    validate: {
      validator: function (value: any) {
        return encrypt(value).then(hash => {
          this.password = hash
          return true
        })
      },
    }
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

export default User
