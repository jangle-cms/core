import { Config, Dict, MongoUris, Models, UserModels, MetaModels, ModelsNodeContext, MongoConnections, InitializeUserModelsContext, InitializeJangleModelsConfig, InitializeModelConfig, ModelsContext, Schema, UserModel, IJangleMeta, IJangleItem, IJangleItemMeta, JangleItem, JangleList } from '../types'
import { Meta, User, History } from './schemas'
import * as mongoose from 'mongoose'
import { reject, debug, toCollectionName, stamp, debugWithLabel, formatError } from '../utils'
import { Model } from 'mongoose'

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


type ModelNameInformation = {
  historyModelName: (modelName: string) => string
  historyCollectionName: (modelName: string) => string
  collectionModelName: (modelName: string) => string
  collectionCollectionName: (modelName: string) => string
}

const getModels = ({ historyModelName, historyCollectionName, collectionModelName, collectionCollectionName }: ModelNameInformation) =>
  ({ schemas, connections, Meta }: InitializeUserModelsContext): UserModels =>
    Object.keys(schemas)
      .map((modelName) => {
        const schema = schemas[modelName]
        const history = connections.content.model(historyModelName(modelName), History, historyCollectionName(modelName))

        return {
          modelName,
          content: connections.content.model(collectionModelName(modelName), getContentSchema(Meta, schema), collectionCollectionName(modelName)),
          live: connections.live.model(collectionModelName(modelName), getLiveSchema(schema), collectionCollectionName(modelName)),
          history: history as any
        }
      })

const getListModels = getModels({
  historyModelName: (modelName) => `JangleHistory${modelName}`,
  historyCollectionName: (modelName) => `jangle.history.${toCollectionName(modelName)}`,
  collectionModelName: (modelName) => modelName,
  collectionCollectionName: toCollectionName
})

const getItemModels = getModels({
  historyModelName: (_) => `JangleHistoryItems`,
  historyCollectionName: (_) => `jangle.history.items`,
  collectionModelName: (modelName) => `JangleItems${modelName}`,
  collectionCollectionName: (_) => `jangle.items`
})

const dropIndexes = (model : Model<any>) : Promise<Model<any>> =>
  model.collection.dropIndexes()
    .then((_ : any) => model)
    .catch((_ : any) => model)

const initializeUserModels = (userModels: UserModels): Promise<UserModels> =>
  Promise.all(userModels.map(userModel =>
    Promise.all([
      dropIndexes(userModel.content)
        .catch(formatError),
      dropIndexes(userModel.live)
        .catch(formatError),
      userModel.history
    ])
      .then(([ content, live, history ]) => ({
        modelName: userModel.modelName,
        content,
        live,
        history
      }))
      .catch(reject)
  ))

const jangleAdmin = {
  name: 'Jangle',
  email: 'admin@jangle.io',
  role: 'jangle'
}

const findAdmin = (JangleUser: Model<any>) =>
  JangleUser.findOne({ email: jangleAdmin.email })

const createJangleAdmin = (JangleUser: Model<any>) : Promise<IJangleItem> =>
  findAdmin(JangleUser)
    .lean()
    .exec()
    .then((admin : any) => admin
      ? admin
      : JangleUser.collection
          .insertOne(jangleAdmin)
          .then((_ : any) => findAdmin(JangleUser)) as any
    )

const createItems = (JangleUser: Model<any>, models: UserModels) =>
  createJangleAdmin(JangleUser)
    .then((admin: any) => Promise.all(models.map(({ modelName, content }) => {
      const jangle : IJangleItemMeta = {
        model: modelName,
        version: 1,
        created: stamp(admin._id),
        updated: stamp(admin._id)
      }
      return content
        .count({ 'jangle.model': modelName })
        .lean()
        .exec()
        .then((count: any) => (count === 0)
          ? content.create({ jangle })
          : Promise.resolve(undefined)
        )
    })))
    .then(_ => models)
    .catch(reject)

const initializeJangleModels = ({ connections, schemas }: InitializeJangleModelsConfig): Promise<MetaModels> =>
  Promise.all([
    connections.content.model('JangleUser', schemas.User) as any
  ])
    .then(([ User ]) => ({ User }))
    .catch(reject)

const initializeModels = ({ config, Meta }: InitializeModelConfig) => (connections : MongoConnections): Promise<Models> =>
  Promise.all([
    Promise.resolve(getListModels({ schemas: config.lists, connections, Meta }))
      .then(initializeUserModels),
    Promise.resolve(getItemModels({ schemas: config.items, connections, Meta }))
      .then(initializeUserModels),
    initializeJangleModels({
      connections,
      schemas: {
        User: User,
        History: History
      }
    })
  ])
    .then((context) => {
      const [ _, itemModels, Meta ] = context
      return createItems(Meta.User, itemModels)
        .then(_ => context)
    })
    .then(([ listModels, itemModels, jangleModels ]) => ({
      secret: config.secret,
      listModels,
      itemModels,
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
