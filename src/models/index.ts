import { Config, Dict, MongoUris, IUserModel, IHistoryModel, Models, UserModels } from '../types'
import { Connection, Schema } from 'mongoose'
import * as mongoose from 'mongoose'
import schemas from './schemas'

(mongoose as any).Promise = global.Promise

type ModelsContext = {
  config: Config
}

type MongoConnections = {
  content: Connection
  live: Connection
}

type InitializeUserModelsContext = {
  userSchemas: Dict<Schema>
  connections: MongoConnections
  Meta: Schema
}

type InitializeModelConfig = {
  config: Config
  Meta: Schema
}

type InitializeJangleModelsConfig = {
  connections: MongoConnections,
  schemas: {
    User: Schema,
    History: Schema
  }
}

type JangleModels = {
  User: IUserModel,
  History: IHistoryModel
}

const getConnections = (mongo: MongoUris): MongoConnections => ({
  content: mongoose.createConnection(mongo.content),
  live:  mongoose.createConnection(mongo.live)
})

const getContentSchema = (Meta: Schema, schema: Schema): Schema => {
  schema.add({
    jangle: {
      type: Meta,
      required: [ true, 'User-defined models require Jangle meta.' ]
    }
  })

  schema.set('versionKey', false)
  return schema
}

const getLiveSchema = (schema: Schema): Schema => {
  schema.set('versionKey', false)
  return schema
}

const getUserModels = ({ userSchemas, connections, Meta }: InitializeUserModelsContext): UserModels =>
  Object.keys(userSchemas)
    .map((modelName) => {
      const schema = userSchemas[modelName]
      const contentSchema = getContentSchema(Meta, (schema as any).clone())
      const liveSchema = getLiveSchema((schema as any).clone())

      return {
        modelName,
        content: connections.content.model(modelName, contentSchema),
        live: connections.live.model(modelName, liveSchema)
      }
    })

const initializeUserModels = (pairs: UserModels): Promise<UserModels> =>
  Promise.all(pairs.map(pair =>
    Promise.all([
      (pair.content as any).init(),
      (pair.live as any).init()
    ])
      .then(([ content, live ]) => ({
        modelName: pair.modelName,
        content,
        live
      }))
  ))

const initializeJangleModels = ({ connections, schemas }: InitializeJangleModelsConfig): Promise<JangleModels> =>
  Promise.resolve({
    User: connections.content.model('JangleUser', schemas.User),
    History: connections.content.model('JangleHistory', schemas.History)
  })
    .then(({ User, History }) => Promise.all([
      (User as any).init(),
      (History as any).init()
    ]))
    .then(([ User, History ]) => ({
      User,
      History
    }))

const initializeModels = ({ config, Meta }: InitializeModelConfig) => (connections : MongoConnections): Promise<Models> =>
  Promise.all([
    Promise.resolve(getUserModels({ userSchemas: config.schemas, connections, Meta }))
      .then(initializeUserModels),
    initializeJangleModels({
      connections, 
      schemas: {     
        User: schemas.User(config.secret),
        History: schemas.History
      }
    })
  ])
    .then(([ userModels, jangle ]) => ({
      secret: config.secret,
      userModels,
      jangle
    }))

export default {
  initialize: ({ config }: ModelsContext): Promise<Models> =>
    Promise.resolve(getConnections(config.mongo))
      .then(initializeModels({
        config,
        Meta: schemas.Meta
      }))
}
