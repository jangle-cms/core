import * as crypto from 'crypto'
import { Config, Map, UserConfig, ProtectedListService, ListService, Token, ProtectedJangleCore, JangleCore, Id, Signature } from './types'
import * as bcrypt from 'bcrypt'
import * as pluralize from 'pluralize'
import R = require('ramda');

export const debug = (thing: any) => {
  console.log(thing)
  return thing
}
export const debugWithLabel = (label: string, thing: any) => {
  console.log(label, thing)
  return thing
}

export const stamp = (id: Id): Signature => ({
  by: id,
  at: new Date(Date.now())
})

export const toCollectionName = (thing: string) =>
  pluralize.plural(thing).toLocaleLowerCase()

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

export const isMapOf = (Type: any, thing?: Map<any>): boolean =>
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
  // : config && config.lists && !isMapOf(Schema, config.lists)
  //   ? Promise.reject(parseConfigErrors.badLists)
  // : config && config.items && !isMapOf(Schema, config.items)
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

export const authenticateService = (token: Token, ProtectedListService: ProtectedListService): ListService =>
  Object.keys(ProtectedListService)
    .filter(functionName => functionName !== 'live')
    .reduce((service: any, functionName) => {
      const curriedFunction = R.curryN(2, (ProtectedListService as any)[functionName])
      service[functionName] = allowMissingParams(curriedFunction(token))
      return service
    }, {
      live: ProtectedListService.live
    }) as ListService

export const authenticateServices = (token: Token, ProtectedListServices: Map<ProtectedListService>): Map<ListService> =>
  Object.keys(ProtectedListServices)
    .reduce((services: Map<ListService>, serviceName) => {
      services[serviceName] = authenticateService(token, ProtectedListServices[serviceName])
      return services
    }, {}) as Map<ListService>

export const authenticateCore = (user: UserConfig) => ({ auth, lists, items }: ProtectedJangleCore): Promise<JangleCore> =>
  auth.canSignUp()
    .then(canSignUp => canSignUp
      ? auth.signUp(user)
      : auth.signIn(user.email, user.password)
    )
    .then(({ token }) => ({
      auth,
      lists: authenticateServices(token, lists),
      items: authenticateServices(token, items as any) as any
    }))
    .catch(reject)

const parseDuplicateKeyError = (error: any) : Promise<string> =>
  Promise.resolve(error.message.split(': '))
    .then(([ _prefix, collectionPiece, fieldPiece, _brace, valuePiece ]) => {
      const collectionName = collectionPiece.split(' ')[0].split('.')[1]
      const fieldName = fieldPiece.split(' ').map((index: string) => index.split('_')[0])[0]
      const value = valuePiece.split(' ')[0]

      return Promise.reject(`The ${fieldName} field in the ${collectionName} list is unique. Only one item can be ${value}.`)
    })

const formatValidationError = ({ errors }: any) : Promise<any> => {
  const firstError = errors[Object.keys(errors)[0]]

  if (firstError) {
    switch (firstError.name) {
      case 'CastError':
        const { path, kind, value } = firstError
        return Promise.reject(`The '${path}' field should be a ${kind}, but it was passed a ${typeof value}.`)
    }
  }

  return Promise.reject('Jangle found an unexpected validation error.')
}

export const formatError = (error: any) : Promise<any> => {
  const isDuplicateKeyError = error.code === 11000

  if (isDuplicateKeyError) {
    return parseDuplicateKeyError(error)
  } else if (error.name === 'ValidationError') {
    return formatValidationError(error)
  } else {
    console.error('ERROR', error)
    return Promise.reject(`Something unexpected happened!`)
  }
}
