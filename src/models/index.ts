import { JangleConfig, Dict, IHistory, IUser, MongoUris, IJangleMeta } from '../types'
import mongoose, { Model, Document, Connection, Schema } from 'mongoose'
import schemas from './schemas'

mongoose.Promise = global.Promise

interface IUserModel extends IUser, Document {}
interface IHistoryModel extends IHistory, Document {}

type ModelsContext = {
  config: JangleConfig
}

type Models = {
  content: Dict<Model<Document>>,
  live: Dict<Model<Document>>,
  jangle: {
    User: Model<IUserModel>,
    History: Model<IHistoryModel>
  }
}

type MongoConnections = {
  content: Connection
  live: Connection
}

type ModelPair = {
  modelName: string
  content: Model<Document>
  live: Model<Document>
}

type InitializeUserModelsContext = {
  userSchemas: Dict<Schema>
  connections: MongoConnections
  Meta: Schema
}
type InitializeModelConfig = {
  userSchemas: Dict<Schema>
  Meta: Schema
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

const getUserModels = ({ userSchemas, connections, Meta }: InitializeUserModelsContext): ModelPair[] =>
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

const initializeUserModels = (pairs: ModelPair[]): Promise<ModelPair[]> =>
  Promise.all(pairs.map(pair =>
    Promise.all([
      (pair.content as any).init(),
      (pair.live as any).init()
    ])
      .then(([ content, live]) => ({
        modelName: pair.modelName,
        content,
        live
      }))
  ))

const initializeModels = ({ userSchemas, Meta }: InitializeModelConfig) => (connections: MongoConnections): Models =>
  Promise.resolve(getUserModels({ userSchemas, connections, Meta }))
    .then(initializeUserModels)

export default {
  initialize: ({ config }: ModelsContext): Models => {
    Promise.resolve({
      connections: getConnections(config.mongo),
      schemas: schemas(config)
    })
      .then(({ connections, schemas }) =>
        initializeModels({
          userSchemas: config.schemas,
          Meta: schemas.Meta
        })
      )
  }
}
