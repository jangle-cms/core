import { Config, Dict, MongoUris, Models, UserModels, MetaModels, ModelsNodeContext, MongoConnections, InitializeUserModelsContext, InitializeJangleModelsConfig, InitializeModelConfig, ModelsContext, Schema, UserModel, IJangleMeta, IJangleItem, IJangleItemMeta } from '../types'
import { Meta, User, History } from './schemas'
import * as mongoose from 'mongoose'
import { reject, debug, toCollectionName, stamp } from '../utils'
import { Model } from 'mongoose';

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

const getListModels = ({ schemas, connections, Meta }: InitializeUserModelsContext): UserModels =>
  Object.keys(schemas)
    .map((modelName) => {
      const schema = schemas[modelName]
      const history = connections.content.model(`JangleHistory${modelName}`, History, `jangle.history.${toCollectionName(modelName)}`)

      return {
        modelName,
        content: connections.content.model(modelName, getContentSchema(Meta, schema), toCollectionName(modelName)),
        live: connections.live.model(modelName, getLiveSchema(schema), toCollectionName(modelName)),
        history: history as any
      }
    })

const getItemModels = ({ schemas, connections, Meta }: InitializeUserModelsContext): UserModels =>
  Object.keys(schemas)
    .map((modelName) => {
      const schema = schemas[modelName]
      const history = connections.content.model(`JangleHistoryItems`, History, `jangle.history.items`)

      return {
        modelName,
        content: connections.content.model(`JangleItems${modelName}`, getContentSchema(Meta, schema), `jangle.items`),
        live: connections.live.model(`JangleItems${modelName}`, getLiveSchema(schema), `jangle.items`),
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

const jangleAdminEmail =
  'admin@jangle.io'

const findAdmin = (JangleUser: Model<any>) =>
  JangleUser.findOne({ email: jangleAdminEmail })

const createJangleAdmin = (JangleUser: Model<any>) : Promise<IJangleItem> =>
  findAdmin(JangleUser)
    .lean()
    .exec()
    .then(admin => admin
      ? admin
      : JangleUser.collection
          .insertOne({
            email: jangleAdminEmail,
            role: 'jangle'
          })
          .then(_ => findAdmin(JangleUser)) as any
    )

const createWithoutDefaults = (model: Model<any>, modelName: string, jangle: IJangleItemMeta) =>
  model.updateOne({ 'jangle.model': modelName }, { jangle }, { upsert: true })

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
          ? createWithoutDefaults(content, modelName, jangle)
          : Promise.resolve(undefined)
        )
    })))
    .then(_ => models)
    .catch(reject)

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
