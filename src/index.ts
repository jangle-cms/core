import { ProtectedJangleCore, Config, UserConfig, JangleCore } from './types'
import models from './models'
import auth from './auth'
import services from './services'
import { parseConfig, parseConfigAsUser, authenticateCore } from './utils'

const baseConfig: Config = {
  mongo: {
    content: 'mongodb://localhost/jangle',
    live: 'mongodb://localhost/jangle-live'
  },
  schemas: {},
  secret: 'super-secret'
}

const handleError = Promise.reject

const start = (config: Config): Promise<ProtectedJangleCore> =>
  Promise.resolve(parseConfig(config, baseConfig))
    .then(config => ({ config }))
    .then(models.initialize)
    .then(auth.initialize)
    .then(services.initialize)
    .catch(Promise.reject)

export default {

  start,

  startAsUser: (user: UserConfig, config: Config): Promise<JangleCore> =>
    parseConfigAsUser(user, config, baseConfig)  
      .then(start)
      .then(authenticateCore(user))
      .catch(Promise.reject)

}
