import { Schema, ModelPopulateOptions, Document, Model, Mongoose, Connection } from 'mongoose'

// General

export type MongoUri = string

export type MongoUris = {
  content: MongoUri
  live: MongoUri
}

export type Map<T> = { [key: string]: T }

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
  required: boolean
  isList: boolean
  fields: JangleField[]
  ref: string
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
export type SortOptions = Map<SortOptionValue>

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
export type FindFunction = (params?: FindParams) => Promise<IJangleItem[]>
export type GetFunction = (id: Id, params?: GetParams) => Promise<IJangleItem>

export type PublicFindFunction = (params?: FindParams) => Promise<IItem[]>
export type PublicGetFunction = (id: Id, params?: GetParams) => Promise<IItem>

export type ItemGetFunction = (params?: GetParams) => Promise<IJangleItem>
export type PublicItemGetFunction = (params?: GetParams) => Promise<IItem>

export type CreateFunction = (newItem?: object) => Promise<IJangleItem>
export type UpdateFunction = (id: Id, newItem: object) => Promise<IJangleItem>
export type PatchFunction = (id: Id, newValues: Map<any>) => Promise<IJangleItem>
export type RemoveFunction = (id: Id) => Promise<IJangleItem>

export type ItemUpdateFunction = (newItem: object) => Promise<IJangleItem>
export type ItemPatchFunction = (newValues: Map<any>) => Promise<IJangleItem>

export type IsLiveFunction = (id: Id) => Promise<boolean>
export type PublishFunction = (id: Id) => Promise<IJangleItem>
export type UnpublishFunction = (id: Id) => Promise<IJangleItem>

export type ItemIsLiveFunction = () => Promise<boolean>
export type ItemPublishFunction = () => Promise<IJangleItem>
export type ItemUnpublishFunction = () => Promise<IJangleItem>

export type HistoryFunction = (id: Id) => Promise<IHistory[]>
export type PreviewRollbackFunction = (id: Id, version?: number) => Promise<IJangleItem>
export type RollbackFunction = (id: Id, version?: number) => Promise<IJangleItem>

export type ItemHistoryFunction = () => Promise<IHistory[]>
export type ItemPreviewRollbackFunction = (version?: number) => Promise<IJangleItem>
export type ItemRollbackFunction = (version?: number) => Promise<IJangleItem>

export type SchemaFunction = () => Promise<JangleSchema>

export type LiveService = {
  any: AnyFunction
  count: CountFunction
  find: PublicFindFunction
  get: PublicGetFunction
}

export type ItemLiveService = {
  get: PublicItemGetFunction
}

export type MetaListService = {

  any: AnyFunction
  count: CountFunction
  find: FindFunction
  get: GetFunction

  create: CreateFunction
  update: UpdateFunction
  patch: PatchFunction
  remove: RemoveFunction

  schema: SchemaFunction

}

export type ListService = {

  any: AnyFunction
  count: CountFunction
  find: FindFunction
  get: GetFunction

  create: CreateFunction
  update: UpdateFunction
  patch: PatchFunction
  remove: RemoveFunction

  isLive: IsLiveFunction
  publish: PublishFunction
  unpublish: UnpublishFunction

  history: HistoryFunction
  previewRollback: PreviewRollbackFunction
  rollback: RollbackFunction

  schema: SchemaFunction

  live: LiveService

}

export type ItemService = {

  get: ItemGetFunction
  update: ItemUpdateFunction
  patch: ItemPatchFunction

  isLive: ItemIsLiveFunction
  publish: ItemPublishFunction
  unpublish: ItemUnpublishFunction

  history: ItemHistoryFunction
  previewRollback: ItemPreviewRollbackFunction
  rollback: ItemRollbackFunction

  schema: SchemaFunction

  live: ItemLiveService

}

export type ProtectedMetaListService = {

  any: Protected<AnyFunction>
  count: Protected<CountFunction>
  find: Protected<FindFunction>
  get: Protected<GetFunction>

  create: Protected<CreateFunction>
  update: Protected<UpdateFunction>
  patch: Protected<PatchFunction>
  remove: Protected<RemoveFunction>

  schema: SchemaFunction

}

type Protected<T> = (token: Token) => T

export type ProtectedListService = {

  any: Protected<AnyFunction>
  count: Protected<CountFunction>
  find: Protected<FindFunction>
  get: Protected<GetFunction>

  create: Protected<CreateFunction>
  update: Protected<UpdateFunction>
  patch: Protected<PatchFunction>
  remove: Protected<RemoveFunction>

  publish: Protected<PublishFunction>
  unpublish: Protected<UnpublishFunction>
  isLive: IsLiveFunction
  live: LiveService

  history: Protected<HistoryFunction>
  previewRollback: Protected<PreviewRollbackFunction>
  rollback: Protected<RollbackFunction>

  schema: SchemaFunction

}

export type ProtectedItemService = {

  get: Protected<ItemGetFunction>
  update: Protected<ItemUpdateFunction>
  patch: Protected<ItemPatchFunction>

  history: Protected<ItemHistoryFunction>
  previewRollback: Protected<ItemPreviewRollbackFunction>
  rollback: Protected<ItemRollbackFunction>

  publish: Protected<ItemPublishFunction>
  unpublish: Protected<ItemUnpublishFunction>
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
export type Config = {
  mongo: {
    content: MongoUri
    live: MongoUri
  }
  lists: Map<Schema>
  items: Map<Schema>
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
  schemas: Map<Schema>
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
  lists: Map<ProtectedListService>
  items: Map<ProtectedItemService>
  auth: Authorization
}

export type JangleCore = {
  lists: Map<ListService>
  items: Map<ItemService>
  auth: Authorization
}
