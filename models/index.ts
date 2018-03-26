import { Config, Dict, MongoUris, Models, UserModels, MetaModels, ModelsNodeContext, MongoConnections, InitializeUserModelsContext, InitializeJangleModelsConfig, InitializeModelConfig, ModelsContext, Schema } from '../types'
import { Meta, User, History } from './schemas'
import * as mongoose from 'mongoose'
import { reject, debug, toCollectionName } from '../utils'

export const errors = {
  badUri: 'Could not connect to MongoDB.'
}

export const getConnections = (mongo: MongoUris): Promise<MongoConnections> =>
  Promise.all([
    mongoose.createConnection(mongo.content),
    mongoose.createConnection(mongo.live)
  ])
  .then(([ content, live ]) => ({ content, live }))
  .catch(_reason => Promise.reject(errors.badUri))

export const getContentSchema = (Meta: Schema, schema: Schema): Schema => {
  const contentSchema = (schema as any).clone()
  contentSchema.add({
    jangle: {
      type: Meta,
      required: [ true, 'User-defined models require Jangle meta.' ]
    }
  })

  contentSchema.set('versionKey', false)
  return contentSchema
}

export const getLiveSchema = (schema: Schema): Schema => {
  const liveSchema = (schema as any).clone()
  liveSchema.set('versionKey', false)
  return liveSchema
}

const getUserModels = ({ userSchemas, connections, Meta }: InitializeUserModelsContext): UserModels =>
  Object.keys(userSchemas)
    .map((modelName) => {
      const schema = userSchemas[modelName]
      const history = connections.content.model(`JangleHistory${modelName}`, History, `jangle.history.${toCollectionName(modelName)}`)
      history.collection.name = history.collection.name.split('janglehistory').join('jangle.history.')

      return {
        modelName,
        content: connections.content.model(modelName, getContentSchema(Meta, schema), toCollectionName(modelName)),
        live: connections.live.model(modelName, getLiveSchema(schema), toCollectionName(modelName)),
        history: history as any
      }
    })

const initializeUserModels = (userModels: UserModels): Promise<UserModels> =>
  Promise.all(userModels.map(userModel =>
    Promise.all([
      (userModel.content as any).init(),
      (userModel.live as any).init(),
      (userModel.history as any).init()
    ])
      .then(([ content, live, history ]) => ({
        modelName: userModel.modelName,
        content,
        live,
        history
      }))
      .catch(reject)
  ))

const initializeJangleModels = ({ connections, schemas }: InitializeJangleModelsConfig): Promise<MetaModels> =>
  Promise.all([
    (connections.content.model('JangleUser', schemas.User) as any).init()
  ])
    .then(([ User ]) => ({
      User
    }))
    .catch(reject)

const initializeModels = ({ config, Meta }: InitializeModelConfig) => (connections : MongoConnections): Promise<Models> =>
  Promise.all([
    Promise.resolve(
      getUserModels({ userSchemas: config.lists, connections, Meta })
    )
      .then(initializeUserModels)
      .catch(reject),
    initializeJangleModels({
      connections, 
      schemas: {     
        User: User,
        History: History
      }
    })
  ])
    .then(([ userModels, jangleModels ]) => ({
      secret: config.secret,
      userModels,
      jangleModels
    }))
    .catch(reject)

const initialize = ({ config }: ModelsContext): Promise<Models> =>
  getConnections(config.mongo)
    .then(initializeModels({ config, Meta }))
    .catch(reject)

export default {
  initialize
}
