import * as crypto from 'crypto'
import { Config, Dict, UserConfig, ProtectedService, Service, Token } from './types'
import { Schema } from 'mongoose'

export const hash = (secret: string) => (text : string): string =>
  crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex')

export const isDictOf = (Type: any, thing?: Dict<any>): boolean =>
  thing
    ? Object.keys(thing).every(member => thing[member] instanceof Type)
    : false

export const parseConfig = (config: Config, baseConfig: Config): Config => ({
  mongo: {
    content: config != null && config.mongo && typeof config.mongo.content === 'string'
      ? config.mongo.live
      : baseConfig.mongo.content,
    live: config != null && config.mongo && typeof config.mongo.live === 'string'
      ? config.mongo.live
      : baseConfig.mongo.live
  },
  schemas: config != null && isDictOf(Schema, config.schemas)
      ? config.schemas
      : baseConfig.schemas,
  secret: config != null && typeof config.secret === 'string'
    ? config.secret
    : baseConfig.secret
})

export const isValidUser = (user: UserConfig): boolean =>
  user != null && typeof user.email === 'string' && typeof user.password === 'string'

export const parseConfigAsUser = (user: UserConfig, config: Config, baseConfig: Config): Promise<Config> =>
  isValidUser(user)
    ? Promise.resolve(parseConfig(config, baseConfig))
    : Promise.reject('Must provide a user.')

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
