import { ProtectedJangleCore, Config } from './types'
import models from './models'
import auth from './auth'
import services from './services'
import { parseConfig } from './utils'

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
