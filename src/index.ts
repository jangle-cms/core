import * as mongoose from 'mongoose'
import * as jwt from 'jsonwebtoken'
import { ProtectedJangleCore, Config, UserConfig, JangleCore } from './types'
import { parseConfig, parseConfigAsUser, authenticateCore, reject } from './utils'
import models from './models'
import auth from './auth'
import services from './services'

export const baseConfig: Config = {
  mongo: {
    content: 'mongodb://localhost/jangle',
    live: 'mongodb://localhost/jangle-live'
  },
  schemas: {},
  secret: 'super-secret'
}

export const start = (config: Config): Promise<ProtectedJangleCore> =>
  parseConfig(config, baseConfig)
    .then(config => ({ config }))
    .then(models.initialize({ mongoose }))
    .then(auth.initialize())
    .then(services.initialize())
    .catch(reject)

export const startAsUser = (user: UserConfig, config: Config): Promise<JangleCore> =>
  parseConfigAsUser(user, config, baseConfig)  
    .then(start)
    .then(authenticateCore(user))
    .catch(reject)

export default {
  start,
  startAsUser
}
