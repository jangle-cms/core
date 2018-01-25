import { Models, Auth, Token, IUserModel, Id, Authorization, IUserDocument } from '../types'
import { hash, reject } from '../utils'
import * as jwt from 'jsonwebtoken'

const initialize = () => {
  type AuthContext = {
    secret: string
    User: IUserModel
  }

  const generateToken = (secret: string, payload: object): Token =>
    jwt.sign(payload, secret)

  const decodeToken = (secret: string, token: string): Promise<Id> =>
    new Promise((resolve, reject) =>
      jwt.verify(token, secret, (err, payload : any) =>
        (err || payload == null || payload.id == null)
          ? reject('Token is invalid.')
          : resolve(payload.id)
      )
    )

  const checkUserIdFromToken = (User: IUserModel) => (id: Id): Promise<Id> =>
    User.count({ _id: id })
      .exec()
      .then(count => (count > 0)
        ? id
        : Promise.reject('No user matches that token.')
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
      .catch(reason => {
        console.error('createAdminUser', reason)
        return Promise.reject('Could not create admin user.')
      })

  const makeCreateInitialAdmin = ({ secret, User }: AuthContext) => (email: string, password: string): Promise<Token> =>
    makeHasInitialAdmin(User)()
      .then(hasAdminAlready => hasAdminAlready
        ? Promise.reject('Admin user already exists.')
        : createAdminUser(User, email, password)
      )
      .then(({ _id }) => generateToken(secret, { id: _id }))
      .catch(reject)

  const makeSignIn = ({ secret, User }: AuthContext) => (email: string, password: string): Promise<Token> =>
    User.findOne({ email, password: hash(secret)(password) })
      .lean()
      .exec()
      .then((user : any) => user
        ? generateToken(secret, { id: user._id }) as any
        : Promise.reject('Failed to sign in.')
      )
      .catch(reject)

  const makeAuthorization = (context: AuthContext): Authorization => ({
    signIn: makeSignIn(context),
    createInitialAdmin: makeCreateInitialAdmin(context),
    hasInitialAdmin: makeHasInitialAdmin(context.User)
  })

  return ({ secret, userModels, jangleModels: { User }, jangleModels }: Models): Promise<Auth> =>
    Promise.resolve({
      validate: makeValidate({ secret, User }),
      auth: makeAuthorization({ secret, User }),
      userModels,
      jangleModels
    })
}

export default {
  initialize
}
