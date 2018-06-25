import { Models, Auth, Token, IUserModel, Id, Authorization, IUserDocument, UserConfig, User } from '../types'
import { hash, reject, compare, debug } from '../utils'
import * as jwt from 'jsonwebtoken'

type AuthContext = {
  secret: string
  User: IUserModel
}

export const errors = {
  invalidUser: 'Could not create admin user.',
  noMatch: 'No user matches that token.',
  invalidToken: 'Token is invalid.',
  adminExists: 'Admin user already exists.',
  badLogin: 'Failed to sign in.'
}

const generateToken = (secret: string, payload: object): Token =>
  jwt.sign(payload, secret)

const decodeToken = (secret: string, token: string): Promise<Id> =>
  new Promise((resolve, reject) =>
    jwt.verify(token, secret, (err, payload : any) =>
      (err || payload == null || payload.id == null)
        ? reject(errors.invalidToken)
        : resolve(payload.id)
    )
  )

const checkUserIdFromToken = (User: IUserModel) => (id: Id): Promise<Id> =>
  User.count({ _id: id })
    .exec()
    .then(count => (count > 0)
      ? id
      : Promise.reject(errors.noMatch)
    )
    .catch(reject)

const makeValidate = ({ secret, User }: AuthContext) => (token: Token): Promise<Id> =>
  decodeToken(secret, token)
    .then(checkUserIdFromToken(User))
    .catch(reject)

const makeCanSignUp = (User: IUserModel) => () : Promise<boolean> =>
  User.count({ role: 'admin' })
    .exec()
    .then(count => count === 0)
    .catch(reject)

const createAdminUser = (User: IUserModel, { name, email, password }: UserConfig): Promise<IUserDocument> =>
  User.create({ name, email, password, role: 'admin' })
    .catch(_reason => Promise.reject(errors.invalidUser))

const returnUser = (user : UserConfig) => (token : Token) : User => ({
  name: user.name,
  email: user.email,
  token
})

const makeSignUp = ({ secret, User }: AuthContext) =>
  (user: UserConfig): Promise<User> =>
    makeCanSignUp(User)()
      .then(canSignUp => canSignUp
        ? createAdminUser(User, user)
        : Promise.reject(errors.adminExists)
      )
      .then(({ _id }) => generateToken(secret, { id: _id }))
      .then(returnUser(user))
      .catch(reject)

const makeSignIn = ({ secret, User }: AuthContext) =>
  (email: string, password: string): Promise<User> =>
    User.findOne({ email })
      .select('name email password')
      .lean()
      .exec()
      .then(user => user || Promise.reject(errors.badLogin))
      .then((user : any) =>
        compare(password, user.password)
          .then(isMatch => isMatch
            ? user
            : Promise.reject(errors.badLogin)
          )
      )
      .then((user : any) => ({
        name: user.name,
        email: user.email,
        token: generateToken(secret, { id: user._id })
      }))
      .catch(_reason => Promise.reject(errors.badLogin))

const makeAuthorization = (context: AuthContext): Authorization => ({
  signIn: makeSignIn(context),
  signUp: makeSignUp(context),
  canSignUp: makeCanSignUp(context.User)
})

const initialize = ({ secret, listModels, itemModels, jangleModels: { User }, jangleModels }: Models): Promise<Auth> =>
  Promise.resolve({
    validate: makeValidate({ secret, User }),
    auth: makeAuthorization({ secret, User }),
    listModels,
    itemModels,
    jangleModels
  })

export default {
  initialize
}
