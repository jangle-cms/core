import {
  Auth, ProtectedJangleCore,
  UserModels, ValidateFunction,
  MetaModels, ProtectedListService, IJangleItem, Map, UserModel, AnyParams, CountParams, FindParams, GetParams, Id, IJangleItemInput, IHistoryDocument, Model,
  Document,
  JangleSchema,
  JangleField,
  ProtectedItemService
} from '../types'
import * as R from 'ramda'
import { reject, stamp, formatError } from '../utils'
import { Schema, Query } from 'mongoose'
import * as pluralize from 'pluralize'

type InitializeListServicesConfig = {
  listModels: UserModels
  validate: ValidateFunction
  jangleModels: MetaModels
}

type InitializeItemServicesConfig = {
  itemModels: UserModels
  validate: ValidateFunction
  jangleModels: MetaModels
}

type ListService = ProtectedListService
type ListServices = Map<ListService>
type ItemService = ProtectedItemService
type ItemServices = Map<ItemService>

export const errors = {
  missingId: 'Must provide an _id.',
  missingItem: 'No item provided.',
  notFound: 'Item not found.',
  negativeVersionNumber: 'Version must be greater than zero.'
}

const getDefaultsForSchema = (schema: Schema): Map<any> => {
  const paths = (schema as any).paths
  return Object.keys(paths)
    .filter(path => [ 'jangle', '_id' ].indexOf(path) === -1)
    .reduce((defaults : Map<any>, key) => {
      defaults[key] = paths[key].defaultValue || undefined
      return defaults
    }, {})
}

const provideDefaultValues = (schema: Schema) => (original: Map<any> | null) : Map<any> => {
  const defaults = getDefaultsForSchema(schema)
  const originalItem = original || {}
  return [ ...Object.keys(originalItem), ...Object.keys(defaults) ]
    .reduce((item, key) => {
      if (originalItem[key] != null) {
        item[key] = originalItem[key]
      } else if (defaults[key] != null) {
        item[key] = defaults[key]
      }
      return item
    }, {} as Map<any>)
}

const initializeListServices = ({ listModels, validate }: InitializeListServicesConfig): ListServices =>
  listModels.reduce((lists: ListServices, model) => {
    lists[model.modelName] = initializeListService(validate, model)
    return lists
  }, {})

const initializeItemServices = ({ itemModels, validate }: InitializeItemServicesConfig): ItemServices =>
  itemModels.reduce((items: ItemServices, model) => {
    items[model.modelName] = initializeItemService(model.modelName, validate, model)
    return items
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

const makeFind = ({ model, schema }: ModifyContext) => (params?: FindParams): Promise<IJangleItem[]> => {
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
    .then((items : any) => items.map(provideDefaultValues(schema)))
    .then((items : any) => items.filter((item: Map<any>) => Object.keys(item).length > 0))
    .catch(reject) as any
}

const makeGet = (schema: Schema, query: Query<any>, params?: GetParams): Promise<any> => {
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
    .then(provideDefaultValues(schema))
    .then(item => Object.keys(item).length > 0
      ? item
      : undefined
    )
    .catch(reject) as any
}

const makeListGet = ({ model, schema }: ModifyContext) => (_id: Id, params?: GetParams): Promise<IJangleItem> =>
  (_id == null)
    ? Promise.reject(errors.missingId)
    : makeGet(schema, model.findOne({ _id }), params)

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
  schema: Schema
}

type HistoryContext = {
  userId: Id
  content: Model<Document>
  history: Model<IHistoryDocument>
}

type UpdateContext = {
  live: Model<Document>
  content: Model<Document>
  history: Model<IHistoryDocument>
}

const makeCreate = (context: ModifyContext) => (userId: Id, item: object = {}): Promise<IJangleItem> =>
  (item)
    ? makeCreateWithItem(context, addCreateMeta(userId, item))
    : Promise.reject(errors.missingItem)

const makeCreateWithItem = ({ model, schema }: ModifyContext, item: object) =>
  model.create(item)
    .then(({ _id }) => makeListGet({ model, schema })(_id))
    .catch(formatError) as any

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
      .catch(formatError) as any

const makeUpdateFunction = ({ overwrite, ignoreItem, removeItem }: UpdateConfig) =>
  ({ content, history, live }: UpdateContext, userId: Id, id: Id, newItem?: object): Promise<IJangleItem> =>
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
                  ? makeListUnpublish({ content, live }, id)
                      .then(_ => createHistoryItem({ history, content, userId }, oldItem)({}))
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
          .catch(formatError) as any
    : Promise.reject(errors.missingItem)

const makeUpdate = makeUpdateFunction({ overwrite: true })
const makePatch = makeUpdateFunction({ overwrite: false })
const makeRemove = makeUpdateFunction({ overwrite: false, ignoreItem: true, removeItem: true })

const makeItemUpdate = (modelName: string, context : UpdateContext, userId: Id, newItem?: object) =>
  context.content.findOne({ 'jangle.model': modelName })
    .lean()
    .exec()
    .then(({ _id } : any) => makeUpdate(context, userId, _id, newItem))

const makeItemPatch = (modelName: string, context : UpdateContext, userId: Id, newItem?: object) =>
  context.content.findOne({ 'jangle.model': modelName })
    .lean()
    .exec()
    .then(({ _id } : any) => makePatch(context, userId, _id, newItem))

type PublishContext = {
  content: Model<Document>
  live: Model<Document>
}

const makeListIsLive = ({ live }: PublishContext, id: Id): Promise<boolean> =>
  id
    ? makeIsLive(live.count({ _id: id }))
    : Promise.reject(errors.missingId)

const makeIsLive = (query : Query<any>) : Promise<boolean> =>
  query
    .lean()
    .exec()
    .then((count: any) => count > 0)
    .catch(reject)

const stripJangleMeta = (doc: any): any => {
  const newDoc = { ...doc }
  delete newDoc.jangle
  return newDoc
}

const makePublish = (live: Model<Document>, query: Query<any>) : Promise<IJangleItem> =>
  query
    .lean()
    .exec()
    .then(doc => doc || reject(errors.notFound))
    .then(stripJangleMeta)
    .then(doc => live.create(doc))
    .catch(reject) as any

const makeListPublish = ({ content, live }: PublishContext, id: Id): Promise<IJangleItem> =>
  id
    ? makePublish(live, content.findOne({ _id: id }))
    : Promise.reject(errors.missingId)

const makeUnpublish = (query: Query<any>) : Promise<IJangleItem> =>
  query
    .lean()
    .exec()
    .catch(reject) as any

const makeListUnpublish = ({ live }: PublishContext, id: Id): Promise<IJangleItem> =>
  id
    ? makeUnpublish(live.findByIdAndRemove(id))
    : Promise.reject(errors.missingId)

const makeHistory = (query: Query<any>) : Promise<IHistoryDocument[]> =>
  query
    .sort('-version')
    .lean()
    .exec()
    .catch(reject) as any

const makeListHistory = ({ history }: HistoryContext, id: Id): Promise<IHistoryDocument[]> =>
  id
    ? makeHistory(history.find({ itemId: id }))
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

const makeHistoryPreview = (historyItemsQuery : Query<any>, currentItemQuery: Query<any>, userId: Id, version?: number): Promise<IJangleItem> =>
    (version !== undefined && version < 1)
      ? Promise.reject(errors.negativeVersionNumber)
      : Promise.all([
          historyItemsQuery
            .sort('-version')
            .limit(version ? undefined as any : 1)
            .lean()
            .exec(),
          currentItemQuery.lean().exec()
        ])
          .then(([ historyItems, currentItem ]) => currentItem
            ? buildOldItem(userId)([ historyItems, currentItem ])
            : buildOldItem(userId)([ historyItems, makeItemFrom(userId, historyItems as IHistoryDocument[]) ])
          )
          .catch(reject) as any

const makeItemHistoryPreview = (modelName: string, history: Model<Document>, content: Model<Document>, userId: Id, version?: number) =>
  makeHistoryPreview(
    history.find(version
      ? { 'jangle.model': modelName, version: { $gte: version } }
      : { 'jangle.model': modelName }
    ),
    content.findOne({ 'jangle.model': modelName }),
    userId,
    version
  )

const makeListHistoryPreview = ({ userId, history, content }: HistoryContext, id: Id, version?: number): Promise<IJangleItem> =>
  (id === undefined)
    ? Promise.reject(errors.missingId)
    : makeHistoryPreview(
      history.find(version
        ? { itemId: id, version: { $gte: version } }
        : { itemId: id }
      ),
      content.findById(id),
      userId,
      version
    )

const excludeNames = (names: string[]) => ({ name }: JangleField) : boolean =>
  names.indexOf(name) === -1

const makeSchema = (content: Model<Document>) : Promise<JangleSchema> => {
  const schema : any = (content.schema as any).paths
  const fieldNames = Object.keys(schema)

  return Promise.resolve({
    name: content.modelName,
    slug: pluralize(content.modelName).toLowerCase(),
    labels: {
      singular: content.modelName,
      plural: pluralize(content.modelName)
    },
    fields: fieldNames
      .map(name => {
        const field = (schema[name])
        const refOrSchema = (field : any, otherField: any): string =>
          (field.options && field.options.ref) || otherField.instance 
        return {
          name,
          label: name,
          type: field.instance === 'Array'
            ? refOrSchema(field, field.caster) + '[]'
            : refOrSchema(field, field),
          default: '',
          required: field.isRequired || false
        }
      })
      .filter(excludeNames([ 'jangle', '_id' ]))
  })
}

const initializeItemService = (modelName: string, validate: ValidateFunction, { content, live, history }: UserModel): ItemService => {
  const service : ItemService = {

    get: (token) => (params) => validate(token).then(_ => makeGet(content.schema, content.findOne({ 'jangle.model': modelName }), params)),

    update: (token) => (newItem) => validate(token).then(userId => makeItemUpdate(modelName, { live, content, history }, userId, newItem)),
    patch: (token) => (newItem) => validate(token).then(userId => makeItemPatch(modelName, { live, content, history }, userId, newItem)),

    isLive: () => makeIsLive(live.count({ 'jangle.model': modelName })),
    publish: (token) => () => validate(token).then(_ => makePublish(live, content.findOne({ 'jangle.model': modelName }))),
    unpublish: (token) => () => validate(token).then(_ => makeUnpublish(live.findOneAndRemove({ 'jangle.model': modelName }))),

    history: (token) => () => validate(token).then(_ => makeHistory(history.find({ 'jangle.model': modelName }))),
    previewRollback: (token) => (version) => validate(token).then(userId => makeItemHistoryPreview(modelName, history, content, userId, version)),
    rollback: (token) => (version) =>
      validate(token)
        .then(userId => makeItemHistoryPreview(modelName, history, content, userId, version))
        .then((newItem) => service.update(token)(newItem)),

    schema: () => makeSchema(content),

    live: {
      get: (params) => makeGet(live.schema, live.findOne({ 'jangle.model': modelName }), params)
    }
  }

  return service
}

const initializeListService = (validate: ValidateFunction, { content, live, history }: UserModel): ListService => {

  const service : ListService = {

    any: (token) => (params) => validate(token).then(_id => makeAny({ model: content })(params)),
    count: (token) => (params) => validate(token).then(_id => makeCount({ model: content })(params)),
    find: (token) => (params) => validate(token).then(_id => makeFind({ model: content, schema: content.schema })(params)),
    get: (token) => (id, params) => validate(token).then(_id => makeListGet({ model: content, schema: content.schema })(id, params)),

    create: (token) => (newItem) => validate(token).then(userId => makeCreate({ model: content, schema: content.schema })(userId, newItem)),
    update: (token) => (id, newItem) => validate(token).then(userId => makeUpdate({ content, history, live }, userId, id, newItem)),
    patch: (token) => (id, newValues) => validate(token).then(userId => makePatch({ content, history, live }, userId, id, newValues)),
    remove: (token) => (id) => validate(token).then(userId => makeRemove({ content, history, live }, userId, id)),

    isLive: (id) => makeListIsLive({ content, live }, id),
    publish: (token) => (id) => validate(token).then(_ => makeListPublish({ content, live }, id)),
    unpublish: (token) => (id) => validate(token).then(_ => makeListUnpublish({ content, live }, id)),

    history: (token) => (id) => validate(token).then(userId => makeListHistory({ history, content, userId }, id)),
    previewRollback: (token) => (id, version) => validate(token).then(userId => makeListHistoryPreview({ userId, history, content }, id, version)),
    rollback: (token) => (id, version) =>
      validate(token)
        .then(userId => Promise.all([
          makeListHistoryPreview({ userId, history, content }, id, version),
          service.any(token)({ where: { _id: id } })
        ]))
        .then(([ newItem, hasExistingItem ]) =>
          hasExistingItem
            ? service.update(token)(id, newItem)
            : makeCreateWithItem({ model: content, schema: content.schema }, { ...newItem, _id: id })
        ),

    schema: () => makeSchema(content),

    live: {
      any: makeAny({ model: live }),
      count: makeCount({ model: live }),
      find: makeFind({ model: live, schema: content.schema }),
      get: makeListGet({ model: live, schema: content.schema })
    }
  }

  return service
}

const initialize = ({ auth, listModels, itemModels, validate, jangleModels }: Auth): Promise<ProtectedJangleCore> =>
  Promise.all([
    Promise.resolve(auth),
    initializeListServices({ listModels, validate, jangleModels }),
    initializeItemServices({ itemModels, validate, jangleModels })
  ])
    .then(([ auth, lists, items ]) => ({ auth, lists, items }))
    .catch(reject)

export default {
  initialize
}
