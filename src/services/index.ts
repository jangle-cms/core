import {
  Auth, ProtectedJangleCore,
  UserModels, ValidateFunction,
  MetaModels, ProtectedService, IJangleItem, Dict, UserModel, Token, AnyParams, ProtectedAnyFunction, CountParams, FindParams, GetParams, Id, IJangleItemInput, Signature, Status, IHistoryDocument, Model,
  Document
} from '../types'
import * as R from 'ramda'
import { reject, debug } from '../utils'

type InitializeServicesConfig = {
  userModels: UserModels
  validate: ValidateFunction
  jangleModels: MetaModels
}

type Service = ProtectedService<IJangleItem>
type Services = Dict<Service>

const initialize = () => {

  const initializeServices = ({ userModels, validate }: InitializeServicesConfig): Services =>
    userModels.reduce((services: Services, userModel) => {
      services[userModel.modelName] = initializeService(validate, userModel)
      return services
    }, {})

  const makeAny = ({ model }: { model: Model<Document> }) => (params?: AnyParams): Promise<boolean> =>
    model.count(params && params.where ? params.where : {})
      .lean()
      .exec()
      .then((count: any) => count > 0)
      .catch(reject)

  const makeCount = ({ model }: { model: Model<Document> }) => (params?: CountParams): Promise<number> =>
    model.count(params && params.where ? params.where : {})
      .lean()
      .exec()
      .then((count: any) => count)
      .catch(reject)

  const makeFind = ({ model }: { model: Model<Document> }) => (params?: FindParams): Promise<IJangleItem[]> =>
    model.find()
      .where(params && params.where ? params.where : {})
      .skip(params && params.skip ? params.skip : 0)
      .limit(params && params.limit ? params.limit : undefined as any)
      .populate(params && params.populate ? params.populate : undefined as any)
      .select(params && params.select ? params.select : undefined as any)
      .sort(params && params.sort ? params.sort : undefined as any)
      .lean()
      .exec()
      .catch(reject) as any

  const makeGet = ({ model }: { model: Model<Document> }) => (_id: Id, params?: GetParams): Promise<IJangleItem> =>
    model.findOne({ _id })
      .populate(params && params.populate ? params.populate : undefined as any)
      .select(params && params.select ? params.select : undefined as any)
      .lean()
      .exec()
      .catch(reject) as any

  const stamp = (id: Id): Signature => ({
    by: id,
    at: new Date(Date.now())
  })

  const addCreateMeta = (userId: Id, item: object): IJangleItemInput => ({
    ...item,
    jangle: {
      version: 1,
      status: 'visible',
      created: stamp(userId),
      updated: stamp(userId)
    }
  })

  const addUpdateMeta = (userId: Id, oldItem: any, item: any, status?: Status): IJangleItemInput => ({
    ...item,
    jangle: {
      ...oldItem.jangle,
      version: oldItem.jangle.version + 1,
      updated: stamp(userId),
      status: status || oldItem.jangle.status
    }
  })

  type UpdateConfig = {
    overwrite: boolean,
    status?: Status
  }

  type ModifyContext = {
    model: Model<Document>
  }

  type HistoryContext = {
    content: Model<Document>
    history: Model<IHistoryDocument>
  }

  const makeCreate = ({ model }: ModifyContext) => (userId: Id, item: object): Promise<IJangleItem> =>
    model.create(addCreateMeta(userId, item)) as any

  const makeObjectList = (obj: any) =>
    Object.keys(obj).map(key => ({ [key]: obj[key] }))

  const result = (list: any) =>
    list.map((obj: any) => {
      const key = Object.keys(obj)[0]
      const value = obj[key]
      return {
        field: key,
        oldValue: value
      }
    })

  const makeHistoryItem = (oldItem: any, newItem: any) =>
    result(R.difference(makeObjectList(oldItem), makeObjectList(newItem)))

  const createHistoryItem = ({ history }: HistoryContext, oldItem: IJangleItem) => (newItem: any): Promise<any> =>
    history.create({
      itemId: oldItem._id,
      version: oldItem.jangle.version,
      status: oldItem.jangle.status,
      updated: oldItem.jangle.updated,
      changes: makeHistoryItem(oldItem, newItem)
    })
      .then((_historyItem: any) => newItem)
      .catch(reject) as any

  const makeUpdateFunction = ({ overwrite, status }: UpdateConfig) => ({ content, history }: HistoryContext, userId: Id, id: Id, newItem: object): Promise<IJangleItem> =>
    content.findById(id)
      .lean()
      .exec()
      .then((oldItem: any) =>
        content.findByIdAndUpdate(
          id,
          addUpdateMeta(userId, oldItem, newItem, status), {
            runValidators: true,
            overwrite,
            setDefaultsOnInsert: true
          } as any
        )
          .lean()
          .exec()
          .then(createHistoryItem({ history, content }, oldItem))
          .catch(reject)
      )
      .catch(reject) as any

  const makeUpdate = makeUpdateFunction({ overwrite: true })
  const makePatch = makeUpdateFunction({ overwrite: true })
  const makeRemove = makeUpdateFunction({ overwrite: true, status: 'hidden' })

  type PublishContext = {
    content: Model<Document>
    live: Model<Document>
  }

  const makeIsLive = ({ live }: PublishContext, id: Id): Promise<boolean> =>
    live.count({ _id: id })
      .lean()
      .exec()
      .then((count: any) => count > 0)
      .catch(reject)

  const stripJangleMeta = (doc: any): any => ({
    ...doc,
    jangle: undefined
  })

  const makePublish = ({ content, live }: PublishContext, id: Id): Promise<IJangleItem> =>
    content.findById(id)
      .lean()
      .exec()
      .then(stripJangleMeta)
      .then(live.create)
      .catch(reject) as any

  const makeUnpublish = ({ live }: PublishContext, id: Id): Promise<IJangleItem> =>
    live.findByIdAndRemove(id)
      .lean()
      .exec()
      .catch(reject) as any

  const makeHistory = ({ history }: HistoryContext, id: Id): Promise<IHistoryDocument[]> =>
    history.find({ itemId: id })
      .lean()
      .exec()
      .catch(reject) as any

  const buildOldItem = ([historyItems, currentItem]: any): Promise<any> =>
    historyItems.reduce((item: any, { changes }: any) => {
      changes.forEach(({ field, oldValue }: any) => {
        item[field] = oldValue
      })
      return item
    }, {
        ...currentItem,
        jangle: {
          ...currentItem.jangle,
          version: currentItem.jangle.version + 1
        }
      })

  const makeHistoryPreview = ({ history, content }: HistoryContext, id: Id, version: number): Promise<IJangleItem> =>
    Promise.all([
      history.find({ itemId: id, version: { $gte: version } })
        .sort('-version')
        .lean()
        .exec(),
      content.findById(id).lean().exec()
    ])
      .then(buildOldItem)
      .catch(reject) as any

  const makeSchema = (content: Model<Document>) =>
    content.schema as any

  const initializeService = (validate: ValidateFunction, { content, live, history }: UserModel): Service => {
    const service: Service = {

      any: (token, params) => validate(token).then(_id => makeAny({ model: content })(params)),
      count: (token, params) => validate(token).then(_id => makeCount({ model: content })(params)),
      find: (token, params) => validate(token).then(_id => makeFind({ model: content })(params)),
      get: (token, id, params) => validate(token).then(_id => makeGet({ model: content })(id, params)),

      create: (token, newItem) => validate(token).then(userId => makeCreate({ model: content })(userId, newItem)),
      update: (token, id, newItem) => validate(token).then(userId => makeUpdate({ content, history }, userId, id, newItem)),
      patch: (token, id, newValues) => validate(token).then(userId => makePatch({ content, history }, userId, id, newValues)),
      remove: (token, id) => validate(token).then(userId => makeRemove({ content, history }, userId, id, {})),

      isLive: (token, id) => validate(token).then(_ => makeIsLive({ content, live }, id)),
      publish: (token, id) => validate(token).then(_ => makePublish({ content, live }, id)),
      unpublish: (token, id) => validate(token).then(_ => makeUnpublish({ content, live }, id)),

      history: (token, id) => validate(token).then(_ => makeHistory({ history, content }, id)),
      preview: (token, id, version) => validate(token).then(_ => makeHistoryPreview({ history, content }, id, version)),
      restore: (token, id, version) => validate(token).then(_ => makeHistoryPreview({ history, content }, id, version).then(newItem => service.update(token, id, newItem))),

      schema: (token) => validate(token).then(_ => makeSchema(content)),

      live: {
        any: makeAny({ model: live }),
        count: makeCount({ model: live }),
        find: makeFind({ model: live }),
        get: makeGet({ model: live })
      }

    }

    return service
  }

  return ({ auth, userModels, validate, jangleModels }: Auth): Promise<ProtectedJangleCore> =>
    Promise.all([
      Promise.resolve(auth),
      initializeServices({ userModels, validate, jangleModels })
    ])
      .then(([ auth, services ]) => ({ auth, services }))
      .catch(reject)
}

export default {
  initialize
}
