import * as crypto from 'crypto'
import { Config, Dict, UserConfig, ProtectedListService, ListService, Token, ProtectedJangleCore, JangleCore } from './types'
import { Schema } from 'mongoose'
import * as bcrypt from 'bcrypt'
import * as pluralize from 'pluralize'
import R = require('ramda');

export const debug = (thing: any) => {
  console.log(thing)
  return thing
}

export const toCollectionName = (thing: string) => pluralize.plural(thing).toLocaleLowerCase();

export const reject = (reason: string) => Promise.reject(reason)

export const hash = (secret: string) => (text : string): string =>
  crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex')

export const encrypt = (password: string) : Promise<string> =>
  new Promise((resolve, reject) => {
    if (password) {
      bcrypt.genSalt((err, salt) => {
        if (err) {
          reject(err)
        } else {
          bcrypt.hash(password, salt, (err, hash) =>
            (err)
              ? reject(err)
              : resolve(hash)
          )
        }
      })
    } else {
      reject('No password provided.')
    }
  })

export const compare = (password: string, hash: string) : Promise<boolean> =>
  new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, isMatch) => {
      if (err) {
        reject(err)
      } else {
        resolve(isMatch)
      }
    })
  })

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
  badLists: 'The values for the `lists` object can only be of type `Schema`.',
  badItems: 'The values for the `items` object can only be of type `Schema`.',
  badSecret: 'The `secret` option must be a string.'
}

export const parseConfig = (config: Config, baseConfig: Config): Promise<Config> =>
  config instanceof Array || (config !== undefined && typeof config !== 'object')
    ? Promise.reject(parseConfigErrors.notAnObjectOrUndefined)
  : config && config.mongo && config.mongo.content && !startsWith('mongodb://', config.mongo.content)
    ? Promise.reject(parseConfigErrors.badContentUri)
  : config && config.mongo && config.mongo.live && !startsWith('mongodb://', config.mongo.live)
    ? Promise.reject(parseConfigErrors.badLiveUri)
  // : config && config.lists && !isDictOf(Schema, config.lists)
  //   ? Promise.reject(parseConfigErrors.badLists)
  // : config && config.items && !isDictOf(Schema, config.items)
  //   ? Promise.reject(parseConfigErrors.badItems)
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
    lists: config != null && config.lists
        ? config.lists
        : baseConfig.lists,
    items: config != null && config.items
        ? config.items
        : baseConfig.items,
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

const allowMissingParams = (f : any) => (arg : any, ...params : any[]) =>
  f(arg, ...params)

export const authenticateService = <T>(token: Token, ProtectedListService: ProtectedListService<T>): ListService<T> =>
  Object.keys(ProtectedListService)
    .filter(functionName => functionName !== 'live')
    .reduce((service: any, functionName) => {
      service[functionName] = allowMissingParams(R.curryN(2, (ProtectedListService as any)[functionName])(token))
      return service
    }, {
      live: ProtectedListService.live
    }) as ListService<T>

export const authenticateServices = (token: Token, ProtectedListServices: Dict<ProtectedListService<any>>): Dict<ListService<any>> =>
  Object.keys(ProtectedListServices)
    .reduce((services: Dict<ListService<any>>, serviceName) => {
      services[serviceName] = authenticateService(token, ProtectedListServices[serviceName])
      return services
    }, {}) as Dict<ListService<any>>

export const authenticateCore = ({ email, password }: UserConfig) => ({ auth, lists }: ProtectedJangleCore): Promise<JangleCore> =>
  auth.hasInitialAdmin()
    .then(hasInitialAdmin => hasInitialAdmin
      ? auth.signIn(email, password)
      : auth.createInitialAdmin(email, password)
    )
    .then(token => ({
      auth: auth,
      lists: authenticateServices(token, lists)
    }))
    .catch(reject)
