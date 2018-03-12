import {
  Auth, ProtectedJangleCore,
  UserModels, ValidateFunction,
  MetaModels, ProtectedService, IJangleItem, Dict, UserModel, Token, AnyParams, ProtectedAnyFunction, CountParams, FindParams, GetParams, Id, IJangleItemInput, Signature, Status, IHistoryDocument, Model,
  Document
} from '../types'
import * as R from 'ramda'
import { reject, debug } from '../utils'
import { Schema } from 'mongoose'
import * as pluralize from 'pluralize'

type InitializeServicesConfig = {
  userModels: UserModels
  validate: ValidateFunction
  jangleModels: MetaModels
}

type Service = ProtectedService<IJangleItem>
type Services = Dict<Service>

export const errors = {
  missingId: 'Must provide an _id.',
  missingItem: 'No item provided.',
  missingVersionNumber: 'No version number provided.',
  negativeVersionNumber: 'Version must be greater than zero.'
}

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

const makeFind = ({ model }: { model: Model<Document> }) => (params?: FindParams): Promise<IJangleItem[]> => {
  let query = model.find()

  if (params) {
    query = query
      .where(params.where ? params.where : {})
      .skip(params.skip ? params.skip : 0)
      .limit(params.limit ? params.limit : undefined as any)
      .select(params.select ? params.select : undefined as any)
      .sort(params.sort ? params.sort : undefined as any)

    if (params.populate) {
      query = query.populate(params.populate)
    }
  }

  return query
    .lean()
    .exec()
    .catch(reject) as any
}

const makeGet = ({ model }: { model: Model<Document> }) => (_id: Id, params?: GetParams): Promise<IJangleItem> => {
  if (_id == null) {
    return Promise.reject(errors.missingId)
  } else {
    let query = model.findOne({ _id })

    if (params) {
      query = query
        .select(params.select ? params.select : undefined as any)

      if (params.populate) {
        query = query.populate(params.populate)
      }
    }

    return query
      .lean()
      .exec()
      .catch(reject) as any
  }
}

const stamp = (id: Id): Signature => ({
  by: id,
  at: new Date(Date.now())
})

const addCreateMeta = (userId: Id, item: object): IJangleItemInput => {
  const signature = stamp(userId)

  return {
    ...item,
    jangle: {
      version: 1,
      status: 'visible',
      created: signature,
      updated: signature
    }
  }
}

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
  overwrite: boolean
  status?: Status
  ignoreItem?: boolean
}

type ModifyContext = {
  model: Model<Document>
}

type HistoryContext = {
  content: Model<Document>
  history: Model<IHistoryDocument>
}

const makeCreate = ({ model }: ModifyContext) => (userId: Id, item: object): Promise<IJangleItem> =>
  (item)
    ? model.create(addCreateMeta(userId, item))
        .then(({ _id }) => makeGet({ model })(_id))
        .catch(reject)
    : Promise.reject(errors.missingItem)

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
  result(R.difference(
    makeObjectList({ ...oldItem, jangle: undefined }),
    makeObjectList({ ...newItem, jangle: undefined })
  ))

const createHistoryItem = ({ history }: HistoryContext, oldItem: IJangleItem) =>
  (newItem: any): Promise<any> =>
    history.create({
      itemId: oldItem._id,
      version: oldItem.jangle.version,
      status: oldItem.jangle.status,
      updated: oldItem.jangle.updated,
      changes: makeHistoryItem(oldItem, newItem)
    })
      .then((_historyItem: any) => newItem)
      .catch(reject) as any

const makeUpdateFunction = ({ overwrite, status, ignoreItem }: UpdateConfig) =>
  ({ content, history }: HistoryContext, userId: Id, id: Id, newItem?: object): Promise<IJangleItem> =>
    (id == null)
      ? Promise.reject(errors.missingId)
    : (ignoreItem || newItem)
      ? content.findById(id)
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
              .then(_ =>
                content.findById(id)
                  .lean()
                  .exec()
              )
              .then(updatedItem =>
                createHistoryItem({ history, content }, oldItem)(updatedItem)
                  .then(_ => oldItem)
              )
              .catch(reject)
          )
          .catch(reject) as any
    : Promise.reject(errors.missingItem)

const makeUpdate = makeUpdateFunction({ overwrite: true })
const makePatch = makeUpdateFunction({ overwrite: false })
const makeRemove = makeUpdateFunction({ overwrite: false, status: 'hidden', ignoreItem: true })
const makeRestore = makeUpdateFunction({ overwrite: false, status: 'visible', ignoreItem: true })

type PublishContext = {
  content: Model<Document>
  live: Model<Document>
}

const makeIsLive = ({ live }: PublishContext, id: Id): Promise<boolean> =>
  (id)
    ? live.count({ _id: id })
      .lean()
      .exec()
      .then((count: any) => count > 0)
      .catch(reject)
    : Promise.reject(errors.missingId)

const stripJangleMeta = (doc: any): any => {
  const newDoc = { ...doc }
  delete newDoc.jangle
  return newDoc
}

const makePublish = ({ content, live }: PublishContext, id: Id): Promise<IJangleItem> =>
  (id)
    ? content
        .findOne({ _id: id })
        .lean()
        .exec()
        .then(stripJangleMeta)
        .then(doc => live.create(doc))
        .catch(reject) as any
    : Promise.reject(errors.missingId)

const makeUnpublish = ({ live }: PublishContext, id: Id): Promise<IJangleItem> =>
  id
    ? live.findByIdAndRemove(id)
        .lean()
        .exec()
        .catch(reject) as any
    : Promise.reject(errors.missingId)

const makeHistory = ({ history }: HistoryContext, id: Id): Promise<IHistoryDocument[]> =>
  id
    ? history.find({ itemId: id })
        .lean()
        .exec()
        .catch(reject) as any
    : Promise.reject(errors.missingId)

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
  (id === undefined) ?
    Promise.reject(errors.missingId)
  : (version === undefined) ?
    Promise.reject(errors.missingVersionNumber)
  : (version < 1) ?
    Promise.reject(errors.negativeVersionNumber)
  : Promise.all([
      history.find({ itemId: id, version: { $gte: version } })
        .sort('-version')
        .lean()
        .exec(),
      content.findById(id).lean().exec()
    ])
      .then(buildOldItem)
      .catch(reject) as any

const makeSchema = (content: Model<Document>) => {
  const schema : any = (content.schema as any).paths
  const fieldNames = Object.keys(schema)

  return {
    name: content.modelName,
    labels: {
      singular: content.modelName,
      plural: pluralize(content.modelName)
    },
    fields: fieldNames.map(name => {
      const field = schema[name]

      return {
        name,
        label: name,
        type: field.instance,
        default: '',
        required: field.isRequired || false
      }
    })
  }
}

const initializeService = (validate: ValidateFunction, { content, live, history }: UserModel): Service => {
  const service: Service = {

    any: (token, params) => validate(token).then(_id => makeAny({ model: content })(params)),
    count: (token, params) => validate(token).then(_id => makeCount({ model: content })(params)),
    find: (token, params) => validate(token).then(_id => makeFind({ model: content })(params)),
    get: (token, id, params) => validate(token).then(_id => makeGet({ model: content })(id, params)),

    create: (token, newItem) => validate(token).then(userId => makeCreate({ model: content })(userId, newItem)),
    update: (token, id, newItem) => validate(token).then(userId => makeUpdate({ content, history }, userId, id, newItem)),
    patch: (token, id, newValues) => validate(token).then(userId => makePatch({ content, history }, userId, id, newValues)),

    remove: (token, id) => validate(token).then(userId => makeRemove({ content, history }, userId, id)),
    restore: (token, id) => validate(token).then(userId => makeRestore({ history, content }, userId, id)),

    isLive: (token, id) => validate(token).then(_ => makeIsLive({ content, live }, id)),
    publish: (token, id) => validate(token).then(_ => makePublish({ content, live }, id)),
    unpublish: (token, id) => validate(token).then(_ => makeUnpublish({ content, live }, id)),

    history: (token, id) => validate(token).then(_ => makeHistory({ history, content }, id)),
    previewRollback: (token, id, version) => validate(token).then(_ => makeHistoryPreview({ history, content }, id, version)),
    rollback: (token, id, version) => validate(token).then(_ => makeHistoryPreview({ history, content }, id, version).then(newItem => service.update(token, id, newItem))),

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

const initialize = ({ auth, userModels, validate, jangleModels }: Auth): Promise<ProtectedJangleCore> =>
  Promise.all([
    Promise.resolve(auth),
    initializeServices({ userModels, validate, jangleModels })
  ])
    .then(([ auth, services ]) => ({ auth, services }))
    .catch(reject)

export default {
  initialize
}
