import { Models, Auth, Token, IUserModel, Id, Authorization, IUserDocument } from '../types'
import { Model } from 'mongoose'
import * as jwt from 'jsonwebtoken'
import { hash } from '../utils'

type AuthContext = {
  secret: string
  User: IUserModel
}

const generateToken = (secret: string, value: string): Token =>
  jwt.sign(value, secret)

const decodeToken = (secret: string, token: string): Promise<Id> =>
  new Promise((resolve, reject) =>
    jwt.verify(token, secret, (err, id) =>
      (err || id == null)
        ? reject('Token is invalid.')
        : resolve(id)
    )
  )

const checkUserIdFromToken = (User: IUserModel) => (id: Id): Promise<Id> =>
  User.count({ _id: id })
    .exec()
    .then(count => (count > 0)
      ? id
      : Promise.reject('No user matches that token.')
    )
    .catch(Promise.reject)

const makeValidate = ({ secret, User }: AuthContext) => (token: Token): Promise<Id> =>
  decodeToken(secret, token)
    .then(checkUserIdFromToken(User))
    .catch(Promise.reject)

const hasInitialAdmin = (User: IUserModel)=> () : Promise<boolean> =>
  User.count({ role: 'admin' })
    .exec()
    .then(count => count > 0)
    .catch(Promise.reject)

const createAdminUser = (User: IUserModel, email: string, password: string): Promise<IUserDocument> => 
  User.create({ email, password })
    .catch(reason => {
      console.error('createAdminUser', reason)
      return Promise.reject('Could not create admin user.')
    })

const createInitialAdmin = ({ secret, User }: AuthContext) => (email: string, password: string): Promise<Token> =>
  hasInitialAdmin(User)()
    .then(hasAdminAlready => hasAdminAlready
      ? Promise.reject('Admin user already exists.')
      : createAdminUser(User, email, password)
    )
    .then(({ _id }) => generateToken(secret, _id))
    .catch(Promise.reject)

const signIn = ({ secret, User }: AuthContext) => (email: string, password: string): Promise<Token> =>
  User.findOne({ email, password: hash(secret)(password) })
    .lean()
    .exec()
    .then((user : any) => user
      ? generateToken(secret, user._id) as any
      : Promise.reject('Failed to sign in.')
    )
    .catch(reason => {
      console.error('signIn')
      Promise.reject(reason)
    })

const makeAuthorization = (context: AuthContext): Authorization => ({
  signIn: signIn(context),
  createInitialAdmin: createInitialAdmin(context),
  hasInitialAdmin: hasInitialAdmin(context.User)
})

const initialize = ({ secret, userModels, jangle: { User }, jangle }: Models): Promise<Auth> =>
  Promise.resolve({
    validate: makeValidate({ secret, User }),
    auth: makeAuthorization({ secret, User }),
    userModels,
    jangle
  })

export default {
  initialize
}
