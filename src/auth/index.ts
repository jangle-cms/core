import { Models, Auth, Token, IUserModel, Id, Authorization } from '../types'
import jwt from 'jsonwebtoken'

type AuthContext = {
  secret: string
  User: IUserModel
}

const makeValidate = ({ secret, User }: AuthContext) => (token: Token): Promise<Id> =>
  Promise.reject()

const makeAuthorization = ({ secret, User }: AuthContext): Promise<Authorization> =>
  Promise.reject()

const initialize = ({ secret, userModels, jangle: { User, History } }: Models): Promise<Auth> =>
  Promise.all([
    Promise.resolve(makeValidate({ secret, User })),
    makeAuthorization({ secret, User })
  ])
    .then(([ validate, auth ]) => ({
      validate,
      auth,
      userModels,
      History
    }))

export default {
  initialize
}
