import { Schema } from 'mongoose'
import { Dict, Trash, Config, Jangle } from './types'

const isDictOf = (Type: any, thing: Dict<any> | undefined | null): boolean =>
  thing
    ? Object.keys(thing).every(member => thing[member] instanceof Type)
    : false

const parseConfig = (config: Trash, baseConfig: Config): Promise<Config> =>
  Promise.resolve({
    mongo: {
      content: config
        && (config as any).mongo
        && typeof (config as any).mongo.content === 'string'
          ? ((config as any).mongo.content as string)
          : baseConfig.mongo.content,
      live: config
        && (config as any).mongo
        && typeof (config as any).mongo.live === 'string'
          ? ((config as any).mongo.live as string)
          : baseConfig.mongo.live
    },
    schemas: config
      && isDictOf(Schema, (config as any).schemas)
        ? ((config as any).schemas as Dict<Schema>)
        : baseConfig.schemas,
    secret: config && typeof (config as any).secret === 'string'
      ? ((config as any).secret as string)
      : baseConfig.secret,
    user: config
      && (config as any).user
      && typeof (config as any).user.email === 'string'
      && typeof (config as any).user.password === 'string'
        ? {
          email: ((config as any).user.email as string),
          password: ((config as any).user.password as string)
        }
        : undefined
  })

const baseConfig: Config = {
  mongo: {
    content: 'mongodb://localhost/jangle',
    live: 'mongodb://localhost/jangle'
  },
  schemas: {},
  secret: 'super-secret'
}

// export default {
//   start: (config: Trash): Promise<Jangle> =>
//     parseConfig(config, baseConfig)
//       .then(models.initialize)
//       .then(services.initialize)
//       .then(auth.initialize)
//       .catch(handleError)
// }