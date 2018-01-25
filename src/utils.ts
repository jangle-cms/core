import * as crypto from 'crypto'
import { Config, Dict, UserConfig, ProtectedService, Service, Token, ProtectedJangleCore, JangleCore } from './types'
import { Schema } from 'mongoose'

export const debug = (thing: any) => {
  console.log(thing)
  return thing
}

export const hash = (secret: string) => (text : string): string =>
  crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex')

export const isDictOf = (Type: any, thing?: Dict<any>): boolean =>
  thing
    ? Object.keys(thing).every(member => thing[member] instanceof Type)
    : false

const startsWith = (prefix: string, str: string) =>
  typeof str === 'string' && str.indexOf(prefix) === 0

export const parseConfigErrors = {
  notAnObjectOrUndefined: 'The jangle config should be an object or undefined.',
  badContentUri: 'The `mongo.content` option should start with "mongodb://".',
  badLiveUri: 'The `mongo.live` option should start with "mongodb://".',
  badSchemas: 'The values for the `schemas` object can only be of type `Schema`.',
  badSecret: 'The `secret` option must be a string.'
}

export const parseConfig = (config: Config, baseConfig: Config): Promise<Config> =>
  config instanceof Array || (config !== undefined && typeof config !== 'object')
    ? Promise.reject(parseConfigErrors.notAnObjectOrUndefined)
  : config && config.mongo && config.mongo.content && !startsWith('mongodb://', config.mongo.content)
    ? Promise.reject(parseConfigErrors.badContentUri)
  : config && config.mongo && config.mongo.live && !startsWith('mongodb://', config.mongo.live)
    ? Promise.reject(parseConfigErrors.badLiveUri)
  : config && config.schemas && !isDictOf(Schema, config.schemas)
    ? Promise.reject(parseConfigErrors.badSchemas)
  : config && config.secret && typeof config.secret !== 'string'
    ? Promise.reject(parseConfigErrors.badSecret)
  : Promise.resolve({
    mongo: {
      content: config != null && config.mongo && typeof config.mongo.content === 'string'
        ? config.mongo.content
        : baseConfig.mongo.content,
      live: config != null && config.mongo && typeof config.mongo.live === 'string'
        ? config.mongo.live
        : baseConfig.mongo.live
    },
    schemas: config != null && config.schemas
        ? config.schemas
        : baseConfig.schemas,
    secret: config != null && typeof config.secret === 'string'
      ? config.secret
      : baseConfig.secret
  })

export const invalidUserErrors = {
  noUserProvided: 'No user was provided.',
  notAnObject: 'A user should be an object, with both an `email` and `password`.',
  missingEmail: 'A user should have an `email` field.',
  invalidEmail: 'The user\'s `email` should be a string.',
  missingPassword: 'A user should have an `password` field.',
  invalidPassword: 'The user\'s `password` should be a string.'
}

export const isValidUser = (user: UserConfig): Promise<UserConfig> =>
  user == null
    ? Promise.reject(invalidUserErrors.noUserProvided)
  : user instanceof Array || typeof user !== 'object'
    ? Promise.reject(invalidUserErrors.notAnObject)
  : user.email == null
    ? Promise.reject(invalidUserErrors.missingEmail)
  : user.password == null
    ? Promise.reject(invalidUserErrors.missingPassword)
  : typeof user.email !== 'string'
    ? Promise.reject(invalidUserErrors.invalidEmail)
  : typeof user.password !== 'string'
    ? Promise.reject(invalidUserErrors.invalidPassword)
  : Promise.resolve(user)

export const parseConfigAsUser = (user: UserConfig, config: Config, baseConfig: Config): Promise<Config> =>
  isValidUser(user)
    .then(_ => parseConfig(config, baseConfig))
    .catch(reject)

export const authenticateService = <T>(token: Token, protectedService: ProtectedService<T>): Service<T> =>
  Object.keys(protectedService)
    .filter(functionName => functionName !== 'live')
    .reduce((service: any, functionName) => {
      service[functionName] = (protectedService as any)[functionName](token)
      return service
    }, {
      live: protectedService.live
    }) as Service<T>

export const authenticateServices = (token: Token, protectedServices: Dict<ProtectedService<any>>): Dict<Service<any>> =>
  Object.keys(protectedServices)
    .reduce((services: Dict<Service<any>>, serviceName) => {
      services[serviceName] = authenticateService(token, protectedServices[serviceName])
      return services
    }, {}) as Dict<Service<any>>

export const authenticateCore = ({ email, password }: UserConfig) => ({ auth, services }: ProtectedJangleCore): Promise<JangleCore> =>
  auth.hasInitialAdmin()
    .then(hasInitialAdmin => hasInitialAdmin
      ? auth.signIn(email, password)
      : auth.createInitialAdmin(email, password)
    )
    .then(token => ({
      auth: auth,
      services: authenticateServices(token, services)
    }))
    .catch(reject)

export const reject = (reason: string) => Promise.reject(reason)
