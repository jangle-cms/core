import { Schema, ModelPopulateOptions, Document, Model, Mongoose, Connection } from 'mongoose'

// General

export type MongoUri = string

export type MongoUris = {
  content: MongoUri
  live: MongoUri
}

export type Dict<T> = { [key: string]: T }

// Models

export type Id = any

export type Role = 'admin' | 'editor'
export const roles = [ 'admin', 'editor' ]

export type Signature = {
  by: Id
  at: Date
}

export interface IHistory {
  itemId: Id
  version: number
  updated: Signature
  changes: {
    field: string
    oldValue: any
  }[]
}

export type JangleField = {
  name: string
  label: string
  type: string
  default: string
  required: boolean
}

export type JangleSchema = {
  name: string
  slug: string
  labels: {
    singular: string
    plural: string
  }
  fields: JangleField[]
}

export interface IUser {
  name: string
  email: string
  password: string
  role: Role
}

export interface IJangleMeta {
  version: number
  created: Signature
  updated: Signature
}

export interface IJangleItemMeta {
  version: number
  created: Signature
  updated: Signature
  model: string
}

export interface IJangleItem {
  _id: any
  jangle: IJangleMeta
}

export interface IJangleItemInput {
  jangle: IJangleMeta
}

export interface IItem {
  _id: any
}

export interface IUserDocument extends IUser, Document {}
export interface IHistoryDocument extends IHistory, Document {}

export type IUserModel = Model<IUserDocument>
export type IHistoryModel = Model<IHistoryDocument>

export type UserModel = {
  modelName: string
  content: Model<Document>
  live: Model<Document>
  history: IHistoryModel
}

export type UserModels = UserModel[]

export type MetaModels = {
  User: IUserModel
}

export type Models = {
  secret: string 
  listModels: UserModels
  itemModels: UserModels
  jangleModels: MetaModels
}

// Services

export type Token = string

export type WhereOptions = object
export type SelectOptions = object
export type SortOptionValue = 'asc' | 'desc' | 'ascending' | 'descending' | -1 | 1
export type SortOptions = Dict<SortOptionValue>

export type AnyParams = {
  where?: WhereOptions
}

export type CountParams = {
  where?: WhereOptions
}

export type FindParams = {
  where?: WhereOptions
  skip?: number
  limit?: number
  populate?: string | ModelPopulateOptions
  select?: string | SelectOptions
  sort?: string | SortOptions
}

export type GetParams = {
  populate?: string | ModelPopulateOptions
  select?: string | SelectOptions
}

export type AnyFunction = (params?: AnyParams) => Promise<boolean>
export type CountFunction = (params?: CountParams) => Promise<number>
export type FindFunction<T> = (params?: FindParams) => Promise<T[]>
export type GetFunction<T> = (id: Id, params?: GetParams) => Promise<T>

export type ItemGetFunction<T> = (params?: GetParams) => Promise<T>

export type CreateFunction<T> = (newItem?: object) => Promise<T>
export type UpdateFunction<T> = (id: Id, newItem: object) => Promise<T>
export type PatchFunction<T> = (id: Id, newValues: Dict<any>) => Promise<T>
export type RemoveFunction<T> = (id: Id) => Promise<T>

export type ItemUpdateFunction<T> = (newItem: object) => Promise<T>
export type ItemPatchFunction<T> = (newValues: Dict<any>) => Promise<T>

export type IsLiveFunction = (id: Id) => Promise<boolean>
export type PublishFunction<T> = (id: Id) => Promise<T>
export type UnpublishFunction<T> = (id: Id) => Promise<T>

export type ItemIsLiveFunction = () => Promise<boolean>
export type ItemPublishFunction<T> = () => Promise<T>
export type ItemUnpublishFunction<T> = () => Promise<T>

export type HistoryFunction = (id: Id) => Promise<IHistory[]>
export type PreviewRollbackFunction<T> = (id: Id, version?: number) => Promise<T>
export type RollbackFunction<T> = (id: Id, version?: number) => Promise<T>

export type ItemHistoryFunction = () => Promise<IHistory[]>
export type ItemPreviewRollbackFunction<T> = (version?: number) => Promise<T>
export type ItemRollbackFunction<T> = (version?: number) => Promise<T>

export type SchemaFunction = () => Promise<JangleSchema>


export type ProtectedAnyFunction = (token: Token, params?: AnyParams) => Promise<boolean>
export type ProtectedCountFunction = (token: Token, params?: CountParams) => Promise<number>
export type ProtectedFindFunction<T> = (token: Token, params?: FindParams) => Promise<T[]>
export type ProtectedGetFunction<T> = (token: Token, id: Id, params?: GetParams) => Promise<T>

export type ProtectedItemGetFunction<T> = (token: Token, params?: GetParams) => Promise<T>

export type ProtectedCreateFunction<T> = (token: Token, newItem?: object) => Promise<T>
export type ProtectedUpdateFunction<T> = (token: Token, id: Id, newItem: object) => Promise<T>
export type ProtectedPatchFunction<T> = (token: Token, id: Id, newValues: Dict<any>) => Promise<T>
export type ProtectedRemoveFunction<T> = (token: Token, id: Id) => Promise<T>

export type ProtectedItemUpdateFunction<T> = (token: Token, newItem: object) => Promise<T>
export type ProtectedItemPatchFunction<T> = (token: Token, newValues: Dict<any>) => Promise<T>

export type ProtectedPublishFunction<T> = (token: Token, id: Id) => Promise<T>
export type ProtectedUnpublishFunction<T> = (token: Token, id: Id) => Promise<T>

export type ProtectedItemPublishFunction<T> = (token: Token) => Promise<T>
export type ProtectedItemUnpublishFunction<T> = (token: Token) => Promise<T>

export type ProtectedHistoryFunction = (token: Token, id: Id) => Promise<IHistory[]>
export type ProtectedPreviewRollbackFunction<T> = (token: Token, id: Id, version?: number) => Promise<T>
export type ProtectedRollbackFunction<T> = (token: Token, id: Id, version?: number) => Promise<T>

export type ProtectedItemHistoryFunction = (token: Token) => Promise<IHistory[]>
export type ProtectedItemPreviewRollbackFunction<T> = (token: Token, version?: number) => Promise<T>
export type ProtectedItemRollbackFunction<T> = (token: Token, version?: number) => Promise<T>

export type LiveService = {
  any: AnyFunction
  count: CountFunction
  find: FindFunction<IItem>
  get: GetFunction<IItem>
}

export type ItemLiveService = {
  get: ItemGetFunction<IItem>
}

export type MetaListService<T> = {

  any: AnyFunction
  count: CountFunction
  find: FindFunction<T>
  get: GetFunction<T>

  create: CreateFunction<T>
  update: UpdateFunction<T>
  patch: PatchFunction<T>
  remove: RemoveFunction<T>

  schema: SchemaFunction

}

export type ListService<T> = {

  any: AnyFunction
  count: CountFunction
  find: FindFunction<T>
  get: GetFunction<T>

  create: CreateFunction<T>
  update: UpdateFunction<T>
  patch: PatchFunction<T>
  remove: RemoveFunction<T>

  isLive: IsLiveFunction
  publish: PublishFunction<T>
  unpublish: UnpublishFunction<T>

  history: HistoryFunction
  previewRollback: PreviewRollbackFunction<T>
  rollback: RollbackFunction<T>

  schema: SchemaFunction

  live: LiveService

}

export type ItemService<T> = {

  get: ItemGetFunction<T>
  update: ItemUpdateFunction<T>
  patch: ItemPatchFunction<T>

  isLive: ItemIsLiveFunction
  publish: ItemPublishFunction<T>
  unpublish: ItemUnpublishFunction<T>

  history: ItemHistoryFunction
  previewRollback: ItemPreviewRollbackFunction<T>
  rollback: ItemRollbackFunction<T>

  schema: SchemaFunction

  live: ItemLiveService

}

export type ProtectedMetaListService<T> = {

  any: ProtectedAnyFunction
  count: ProtectedCountFunction
  find: ProtectedFindFunction<T>
  get: ProtectedGetFunction<T>

  create: ProtectedCreateFunction<T>
  update: ProtectedUpdateFunction<T>
  patch: ProtectedPatchFunction<T>
  remove: ProtectedRemoveFunction<T>

  schema: SchemaFunction

}

export type ProtectedListService<T> = {

  any: ProtectedAnyFunction
  count: ProtectedCountFunction
  find: ProtectedFindFunction<T>
  get: ProtectedGetFunction<T>

  create: ProtectedCreateFunction<T>
  update: ProtectedUpdateFunction<T>
  patch: ProtectedPatchFunction<T>
  remove: ProtectedRemoveFunction<T>

  publish: ProtectedPublishFunction<T>
  unpublish: ProtectedUnpublishFunction<T>
  isLive: IsLiveFunction
  live: LiveService

  history: ProtectedHistoryFunction
  previewRollback: ProtectedPreviewRollbackFunction<T>
  rollback: ProtectedRollbackFunction<T>

  schema: SchemaFunction

}

export type ProtectedItemService<T> = {

  get: ProtectedItemGetFunction<T>
  update: ProtectedItemUpdateFunction<T>
  patch: ProtectedItemPatchFunction<T>

  history: ProtectedItemHistoryFunction
  previewRollback: ProtectedItemPreviewRollbackFunction<T>
  rollback: ProtectedItemRollbackFunction<T>

  publish: ProtectedItemPublishFunction<T>
  unpublish: ProtectedItemUnpublishFunction<T>
  isLive: ItemIsLiveFunction

  schema: SchemaFunction

  live: ItemLiveService

}

// Auth

export type User = {
  name: String
  email: String
  token: Token
}

export type ValidateFunction = (token: Token) => Promise<Id>
export type SignInFunction = (email: string, password: string) => Promise<User>
export type SignUpFunction = (user: UserConfig) => Promise<User>
export type CanSignUpFunction = () => Promise<boolean>

export type Authorization = {
  signIn: SignInFunction
  signUp: SignUpFunction
  canSignUp: CanSignUpFunction
}

export type Auth = {
  validate: ValidateFunction
  auth: Authorization
  listModels: UserModels
  itemModels: UserModels
  jangleModels: MetaModels
}

// Configuration

export type JangleList = Schema

export type JangleItem = Schema

export type Config = {
  mongo: {
    content: MongoUri
    live: MongoUri
  }
  lists: Dict<JangleList>
  items: Dict<JangleItem>
  secret: string
}

export type UserConfig = {
  name: string
  email: string
  password: string
} 

// Models Module
export type ModelsNodeContext = {
  mongoose: Mongoose
}

export type ModelsContext = {
  config: Config
}

export type MongoConnections = {
  content: Connection
  live: Connection
}

export type InitializeUserModelsContext = {
  schemas: Dict<Schema>
  connections: MongoConnections
  Meta: Schema
}

export type InitializeModelConfig = {
  config: Config
  Meta: Schema
}

export type InitializeJangleModelsConfig = {
  connections: MongoConnections,
  schemas: {
    User: Schema,
    History: Schema
  }
}

export type Schema = Schema
export type Model<T extends Document> = Model<T>
export type Document = Document

// Functions
export type StartFunction =
  (config: Config) => Promise<ProtectedJangleCore>

export type StartAsUserFunction =
  (user: UserConfig, config: Config) => Promise<JangleCore>

// Return values

export type ProtectedJangleCore = {
  lists: Dict<ProtectedListService<IJangleItem>>
  items: Dict<ProtectedItemService<IJangleItem>>
  auth: Authorization
}

export type JangleCore = {
  lists: Dict<ListService<IJangleItem>>
  items: Dict<ItemService<IJangleItem>>
  auth: Authorization
}
