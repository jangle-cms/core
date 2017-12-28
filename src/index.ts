import { Schema } from 'mongoose'
import { Dict, JangleConfig, JangleConfigAsUser, JangleCore, JangleCoreAsUser } from './types'

const isDictOf = (Type: any, thing: Dict<any> | undefined | null): boolean =>
  thing
    ? Object.keys(thing).every(member => thing[member] instanceof Type)
    : false

const parseConfig = (config: JangleConfig, baseConfig: JangleConfig): Promise<JangleConfig> =>
  Promise.resolve({
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

const parseConfigAsUser = (config: JangleConfigAsUser, baseConfig: JangleConfig): Promise<JangleConfigAsUser> =>
  config && config.user && typeof config.user.email === 'string' && typeof config.user.password === 'string'
    ? parseConfig(config, baseConfig)
        .then(({ mongo, schemas, secret }) => ({
          mongo,
          schemas,
          secret,
          user: {
            email: config.user.email,
            password: config.user.password
          }
        }))
    : Promise.reject('Must provided a user.')

const baseConfig: JangleConfig = {
  mongo: {
    content: 'mongodb://localhost/jangle',
    live: 'mongodb://localhost/jangle'
  },
  schemas: {},
  secret: 'super-secret'
}

export default {

  start: (config: JangleConfig): Promise<JangleCore> =>
    parseConfig(config, baseConfig)
      .then(models.initialize)
      .then(services.initialize)
      .then(auth.initialize)
      .catch(handleError),

  startAsUser: (config: JangleConfigAsUser): Promise<JangleCoreAsUser> =>
    parseConfigAsUser(config, baseConfig)
      .then(models.initialize)
      .then(services.initializeAsUser(config ? config.user: undefined))
      .then(auth.initializeAsUser(config ? config.user: undefined))
      .catch(handleError)

}
