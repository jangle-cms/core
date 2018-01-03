import { Schema } from 'mongoose'
import { Dict, JangleCore, ProtectedJangleCore, Config, UserConfig } from './types'
import models from './models'
import auth from './auth'
import services from './services'

const isDictOf = (Type: any, thing: Dict<any> | undefined | null): boolean =>
  thing
    ? Object.keys(thing).every(member => thing[member] instanceof Type)
    : false

const parseConfig = (config: Config, baseConfig: Config): Config => ({
  mongo: {
    content: config && config.mongo && typeof config.mongo.content === 'string'
      ? config.mongo.live
      : baseConfig.mongo.content,
    live: config && config.mongo && typeof config.mongo.live === 'string'
      ? config.mongo.live
      : baseConfig.mongo.live
  },
  schemas: config && isDictOf(Schema, config.schemas)
      ? config.schemas
      : baseConfig.schemas,
  secret: config && typeof config.secret === 'string'
    ? config.secret
    : baseConfig.secret
})

const isValidUser = (user: UserConfig): boolean =>
  user && typeof user.email === 'string' && typeof user.password === 'string'

const parseConfigAsUser = (user: UserConfig, config: Config, baseConfig: Config): Promise<Config> =>
  isValidUser(user)
    ? Promise.resolve(parseConfig(config, baseConfig))
    : Promise.reject('Must provide a user.')

const baseConfig: Config = {
  mongo: {
    content: 'mongodb://localhost/jangle',
    live: 'mongodb://localhost/jangle-live'
  },
  schemas: {},
  secret: 'super-secret'
}

const handleError = (reason: string) =>
  Promise.reject(reason)

export default {

  start: (config: Config): Promise<ProtectedJangleCore> =>
    Promise.resolve(parseConfig(config, baseConfig))
      .then(config => ({ config }))
      .then(models.initialize)
      .then(auth.initialize)
      .then(services.initialize)
      .catch(handleError)

  // startAsUser: (user: UserConfig, config: Config): Promise<JangleCore> =>
  //   parseConfigAsUser(user, config, baseConfig)
  //     .then(models.initialize)
  //     .then(services.initializeAsUser(config ? config.user: undefined))
  //     .then(auth.initializeAsUser(config ? config.user: undefined))
  //     .catch(handleError)

}
