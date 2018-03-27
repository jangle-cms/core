import {
  Auth, ProtectedJangleCore,
  UserModels, ValidateFunction,
  MetaModels, ProtectedListService, IJangleItem, Dict, UserModel, Token, AnyParams, ProtectedAnyFunction, CountParams, FindParams, GetParams, Id, IJangleItemInput, Signature, IHistoryDocument, Model,
  Document,
  JangleSchema,
  JangleField,
  IJangleMeta
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

type ListService = ProtectedListService<IJangleItem>
type ListServices = Dict<ListService>

export const errors = {
  missingId: 'Must provide an _id.',
  missingItem: 'No item provided.',
  negativeVersionNumber: 'Version must be greater than zero.'
}

const initializeListServices = ({ userModels, validate }: InitializeServicesConfig): ListServices =>
  userModels.reduce((services: ListServices, userModel) => {
    services[userModel.modelName] = initializeListService(validate, userModel)
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
      created: signature,
      updated: signature
    }
  }
}

const addUpdateMeta = (userId: Id, oldItem: any, item: any): IJangleItemInput => ({
  ...item,
  jangle: {
    ...oldItem.jangle,
    version: oldItem.jangle.version + 1,
    updated: stamp(userId)
  }
})

type UpdateConfig = {
  overwrite: boolean
  ignoreItem?: boolean
  removeItem?: boolean
}

type ModifyContext = {
  model: Model<Document>
}

type HistoryContext = {
  userId: Id
  content: Model<Document>
  history: Model<IHistoryDocument>
}

const makeCreate = (context: ModifyContext) => (userId: Id, item: object): Promise<IJangleItem> =>
  (item)
    ? makeCreateWithItem(context, addCreateMeta(userId, item))
    : Promise.reject(errors.missingItem)

const makeCreateWithItem = ({ model }: ModifyContext, item: object) =>
  model.create(item)
    .then(({ _id }) => makeGet({ model })(_id))
    .catch(reject)

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
    makeObjectList({ ...oldItem, jangle: undefined, _id: undefined }),
    makeObjectList({ ...newItem, jangle: undefined, _id: undefined })
  ))

const createHistoryItem = ({ history }: HistoryContext, oldItem: IJangleItem) =>
  (newItem: any): Promise<any> =>
    history.create({
      itemId: oldItem._id,
      version: oldItem.jangle.version,
      updated: oldItem.jangle.updated,
      changes: makeHistoryItem(oldItem, newItem)
    })
      .then((_historyItem: any) => newItem)
      .catch(reject) as any

const makeUpdateFunction = ({ overwrite, ignoreItem, removeItem }: UpdateConfig) =>
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
              addUpdateMeta(userId, oldItem, newItem), {
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
                removeItem
                  ? createHistoryItem({ history, content, userId }, oldItem)({})
                      .then(_ => oldItem)
                  : createHistoryItem({ history, content, userId }, oldItem)(updatedItem)
                    .then(_ => oldItem)
              )
              .then(item => (removeItem)
                ? content.findByIdAndRemove(id).lean()
                    .exec()
                    .then(_ => item)
                : item
              )
              .catch(reject)
          )
          .catch(reject) as any
    : Promise.reject(errors.missingItem)

const makeUpdate = makeUpdateFunction({ overwrite: true })
const makePatch = makeUpdateFunction({ overwrite: false })
const makeRemove = makeUpdateFunction({ overwrite: false, ignoreItem: true, removeItem: true })

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
        .sort('-version')
        .lean()
        .exec()
        .catch(reject) as any
    : Promise.reject(errors.missingId)

const buildOldItem = (userId : Id) => ([ historyItems, currentItem ]: any): Promise<any> =>
  historyItems.reduce((item: any, { changes }: any) => {
    changes.forEach(({ field, oldValue }: any) => {
      item[field] = oldValue
    })
    return item
  }, {
    ...currentItem,
    jangle: {
      ...currentItem.jangle,
      updated: stamp(userId),
      version: currentItem.jangle.version + 1
    }
  })

const makeItemFrom = (userId: Id, historyItems: IHistoryDocument[]) => ({
  jangle: {
    created: stamp(userId),
    updated: stamp(userId),
    version: historyItems[0].version + 1
  }
})

const makeHistoryPreview = ({ userId, history, content }: HistoryContext, id: Id, version?: number): Promise<IJangleItem> =>
  (id === undefined) ?
    Promise.reject(errors.missingId)
  : (version !== undefined && version < 1) ?
    Promise.reject(errors.negativeVersionNumber)
  : Promise.all([
      history.find(version
        ? { itemId: id, version: { $gte: version } }
        : { itemId: id }
      )
        .sort('-version')
        .limit(version ? undefined as any : 1)
        .lean()
        .exec(),
      content.findById(id).lean().exec()
    ])
      .then(([ historyItems, currentItem ]) => currentItem
        ? buildOldItem(userId)([ historyItems, currentItem ])
        : buildOldItem(userId)([ historyItems, makeItemFrom(userId, historyItems as IHistoryDocument[]) ])
      )
      .catch(reject) as any

const excludeNames = (names: string[]) => ({ name }: JangleField) : boolean =>
  names.indexOf(name) === -1

const makeSchema = (content: Model<Document>) : JangleSchema => {
  const schema : any = (content.schema as any).paths
  const fieldNames = Object.keys(schema)

  return {
    name: content.modelName,
    labels: {
      singular: content.modelName,
      plural: pluralize(content.modelName)
    },
    fields: fieldNames
      .map(name => {
        const field = schema[name]

        return {
          name,
          label: name,
          type: field.instance,
          default: '',
          required: field.isRequired || false
        }
      })
      .filter(excludeNames([ 'jangle', '_id' ]))
  }
}

const initializeListService = (validate: ValidateFunction, { content, live, history }: UserModel): ListService => {

  const service : ListService = {
    any: (token, params) => validate(token).then(_id => makeAny({ model: content })(params)),
    count: (token, params) => validate(token).then(_id => makeCount({ model: content })(params)),
    find: (token, params) => validate(token).then(_id => makeFind({ model: content })(params)),
    get: (token, id, params) => validate(token).then(_id => makeGet({ model: content })(id, params)),

    create: (token, newItem) => validate(token).then(userId => makeCreate({ model: content })(userId, newItem)),
    update: (token, id, newItem) => validate(token).then(userId => makeUpdate({ content, history, userId }, userId, id, newItem)),
    patch: (token, id, newValues) => validate(token).then(userId => makePatch({ content, history, userId }, userId, id, newValues)),
    remove: (token, id) => validate(token).then(userId => makeRemove({ content, history, userId }, userId, id)),

    isLive: (token, id) => validate(token).then(_ => makeIsLive({ content, live }, id)),
    publish: (token, id) => validate(token).then(_ => makePublish({ content, live }, id)),
    unpublish: (token, id) => validate(token).then(_ => makeUnpublish({ content, live }, id)),

    history: (token, id) => validate(token).then(userId => makeHistory({ history, content, userId }, id)),
    previewRollback: (token, id, version) => validate(token).then(userId => makeHistoryPreview({ userId, history, content }, id, version)),
    rollback: (token, id, version) =>
      validate(token)
        .then(userId => Promise.all([
          makeHistoryPreview({ userId, history, content }, id, version),
          service.any(token, { where: { _id: id } })
        ]))
        .then(([ newItem, hasExistingItem ]) =>
          hasExistingItem
            ? service.update(token, id, newItem)
            : makeCreateWithItem({ model: content }, { ...newItem, _id: id })
        ),

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
    initializeListServices({ userModels, validate, jangleModels })
  ])
    .then(([ auth, lists ]) => ({ auth, lists }))
    .catch(reject)

export default {
  initialize
}
