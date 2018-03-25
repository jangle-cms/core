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

export type Status = 'visible' | 'hidden'
export const statuses = ['visible', 'hidden']

export type Role = 'admin' | 'editor'
export const roles = ['admin', 'editor']

export type Signature = {
  by: Id
  at: Date
}

export interface IHistory {
  itemId: Id
  version: number
  status: Status
  updated: Signature
  changes: {
    field: string
    oldValue: any
  }[]
}

export type JangleSchema = {
  name: string
  labels: {
    singular: string
    plural: string
  }
  fields: {
    name: string
    label: string
    type: string
    default: string
    required: boolean
  }[]
}

export interface IUser {
  email: string
  password: string
  role: Role
  name?: {
    first: string
    last: string
  }
}

export interface IJangleMeta {
  version: number
  status: Status
  created: Signature
  updated: Signature
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
  userModels: UserModels
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

export type CreateFunction<T> = (newItem: object) => Promise<T>
export type UpdateFunction<T> = (id: Id, newItem: object) => Promise<T>
export type PatchFunction<T> = (id: Id, newValues: Dict<any>) => Promise<T>
export type RemoveFunction<T> = (id: Id) => Promise<T>
export type RestoreFunction<T> = (id: Id) => Promise<T>

export type IsLiveFunction = (id: Id) => Promise<boolean>
export type PublishFunction<T> = (id: Id) => Promise<T>
export type UnpublishFunction<T> = (id: Id) => Promise<T>

export type HistoryFunction = (id: Id) => Promise<IHistory[]>
export type PreviewRollbackFunction<T> = (id: Id, version: number) => Promise<T>
export type RollbackFunction<T> = (id: Id, version: number) => Promise<T>

export type SchemaFunction = () => Promise<JangleSchema>


export type ProtectedAnyFunction = (token: Token, params?: AnyParams) => Promise<boolean>
export type ProtectedCountFunction = (token: Token, params?: CountParams) => Promise<number>
export type ProtectedFindFunction<T> = (token: Token, params?: FindParams) => Promise<T[]>
export type ProtectedGetFunction<T> = (token: Token, id: Id, params?: GetParams) => Promise<T>

export type ProtectedCreateFunction<T> = (token: Token, newItem: object) => Promise<T>
export type ProtectedUpdateFunction<T> = (token: Token, id: Id, newItem: object) => Promise<T>
export type ProtectedPatchFunction<T> = (token: Token, id: Id, newValues: Dict<any>) => Promise<T>
export type ProtectedRemoveFunction<T> = (token: Token, id: Id) => Promise<T>
export type ProtectedRestoreFunction<T> = (token: Token, id: Id) => Promise<T>

export type ProtectedIsLiveFunction = (token: Token, id: Id) => Promise<boolean>
export type ProtectedPublishFunction<T> = (token: Token, id: Id) => Promise<T>
export type ProtectedUnpublishFunction<T> = (token: Token, id: Id) => Promise<T>
export type ProtectedHistoryFunction = (token: Token, id: Id) => Promise<IHistory[]>
export type ProtectedPreviewRollbackFunction<T> = (token: Token, id: Id, version: number) => Promise<T>
export type ProtectedRollbackFunction<T> = (token: Token, id: Id, version: number) => Promise<T>
export type ProtectedSchemaFunction = (token: Token) => Promise<JangleSchema>

export type LiveService = {
  any: AnyFunction
  count: CountFunction
  find: FindFunction<IItem>
  get: GetFunction<IItem>
}

export type MetaService<T> = {

  any: AnyFunction
  count: CountFunction
  find: FindFunction<T>
  get: GetFunction<T>

  create: CreateFunction<T>
  update: UpdateFunction<T>
  patch: PatchFunction<T>
  remove: RemoveFunction<T>
  restore: RestoreFunction<T>

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
  restore: RestoreFunction<T>

  isLive: IsLiveFunction
  publish: PublishFunction<T>
  unpublish: UnpublishFunction<T>

  history: HistoryFunction
  previewRollback: PreviewRollbackFunction<T>
  rollback: RollbackFunction<T>

  schema: SchemaFunction

  live: LiveService

}

export type ProtectedMetaService<T> = {

  any: ProtectedAnyFunction
  count: ProtectedCountFunction
  find: ProtectedFindFunction<T>
  get: ProtectedGetFunction<T>

  create: ProtectedCreateFunction<T>
  update: ProtectedUpdateFunction<T>
  patch: ProtectedPatchFunction<T>
  remove: ProtectedRemoveFunction<T>
  restore: ProtectedRestoreFunction<T>

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
  restore: ProtectedRestoreFunction<T>

  isLive: ProtectedIsLiveFunction
  publish: ProtectedPublishFunction<T>
  unpublish: ProtectedUnpublishFunction<T>
  live: LiveService

  history: ProtectedHistoryFunction
  previewRollback: ProtectedPreviewRollbackFunction<T>
  rollback: ProtectedRollbackFunction<T>

  schema: ProtectedSchemaFunction

}

// Auth

export type ValidateFunction = (token: Token) => Promise<Id>
export type SignInFunction = (email: string, password: string) => Promise<Token>
export type CreateInitialAdminFunction = (email: string, password: string) => Promise<Token>
export type HasInitialAdmin = () => Promise<boolean>

export type Authorization = {
  signIn: SignInFunction
  createInitialAdmin: CreateInitialAdminFunction
  hasInitialAdmin: HasInitialAdmin
}

export type Auth = {
  validate: ValidateFunction
  auth: Authorization,
  userModels: UserModels,
  jangleModels: MetaModels
}

// Configuration

export type Config = {
  user?: UserConfig
  mongo: {
    content: MongoUri
    live: MongoUri
  }
  lists: Dict<Schema>
  items: Dict<Schema>
  secret: string
}

export type UserConfig = {
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
  userSchemas: Dict<Schema>
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
  auth: Authorization
}

export type JangleCore = {
  lists: Dict<ListService<IJangleItem>>
  auth: Authorization
}
