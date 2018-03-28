import { Models, Auth, Token, IUserModel, Id, Authorization, IUserDocument } from '../types'
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

const makeHasInitialAdmin = (User: IUserModel)=> () : Promise<boolean> =>
  User.count({ role: 'admin' })
    .exec()
    .then(count => count > 0)
    .catch(reject)

const createAdminUser = (User: IUserModel, email: string, password: string): Promise<IUserDocument> =>
  User.create({ email, password, role: 'admin' })
    .catch(_reason => Promise.reject(errors.invalidUser))

const makeCreateInitialAdmin = ({ secret, User }: AuthContext) => (email: string, password: string): Promise<Token> =>
  makeHasInitialAdmin(User)()
    .then(hasAdminAlready => hasAdminAlready
      ? Promise.reject(errors.adminExists)
      : createAdminUser(User, email, password)
    )
    .then(({ _id }) => generateToken(secret, { id: _id }))
    .catch(reject)

const makeSignIn = ({ secret, User }: AuthContext) => (email: string, password: string): Promise<Token> =>
  User.findOne({ email })
    .select('password')
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
    .then((user : any) => generateToken(secret, { id: user._id }))
    .catch(_reason => Promise.reject(errors.badLogin))

const makeAuthorization = (context: AuthContext): Authorization => ({
  signIn: makeSignIn(context),
  createInitialAdmin: makeCreateInitialAdmin(context),
  hasInitialAdmin: makeHasInitialAdmin(context.User)
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
