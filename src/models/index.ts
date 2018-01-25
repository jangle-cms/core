import { Config, Dict, MongoUris, Models, UserModels, MetaModels, ModelsNodeContext, MongoConnections, InitializeUserModelsContext, InitializeJangleModelsConfig, InitializeModelConfig, ModelsContext, Schema } from '../types'
import schemas from './schemas'
import { reject, debug } from '../utils'

const initialize = ({ mongoose }: ModelsNodeContext) => {

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
        const contentSchema = debug(getContentSchema(Meta, (schema as any).clone()))
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
        getUserModels({ userSchemas: config.schemas, connections, Meta })
      )
        .then(initializeUserModels)
        .catch(reject),
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
      .catch(reject)

  return ({ config }: ModelsContext): Promise<Models> =>
    Promise.resolve(getConnections(config.mongo))
      .then( initializeModels({ config, Meta: schemas.Meta }) )
      .catch(reject)
}

export default {
  initialize
}
