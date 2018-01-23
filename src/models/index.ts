import { Config, Dict, MongoUris, Models, UserModels, MetaModels } from '../types'
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
        live: connections.live.model(modelName, liveSchema),
        history: connections.content.model(`JangleHistory${modelName}`, schemas.History) as any
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
  ))

const initializeJangleModels = ({ connections, schemas }: InitializeJangleModelsConfig): Promise<MetaModels> =>
  Promise.all([
    (connections.content.model('JangleUser', schemas.User) as any).init()
  ])
    .then(([ User ]) => ({
      User
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
    .then(([ userModels, jangleModels ]) => ({
      secret: config.secret,
      userModels,
      jangleModels
    }))

export default {
  initialize: ({ config }: ModelsContext): Promise<Models> =>
    Promise.resolve(getConnections(config.mongo))
      .then( initializeModels({ config, Meta: schemas.Meta }) )
}
