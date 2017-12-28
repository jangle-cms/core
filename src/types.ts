import { Schema, ModelPopulateOptions } from 'mongoose'

// General

export type Trash = object | boolean | string | number | undefined | null

export type MongoUri = string

export type Dict<T> = { [key: string]: T }

// Configuration

export type Config = {
  mongo: {
    content: MongoUri
    live: MongoUri
  }
  schemas: Dict<Schema>
  secret: string
  user?: {
    email: string
    password: string
  }
}

// Models

export type Id = any

export type Status = 'visible' | 'hidden'
export type Role = 'admin' | 'editor'

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

// Services

export type Token = string

export type AnyParams = {
  where?: Object
}

export type CountParams = {
  where?: Object
}

export type FindParams = {
  where?: object
  skip?: number
  limit?: number
  populate?: ModelPopulateOptions
  select?: object
  sort?: object
}

export type GetParams = {
  populate?: object
  select?: object
}

export type AnyFunction = (params?: AnyParams) => Promise<boolean>
export type CountFunction = (params?: CountParams) => Promise<number>
export type FindFunction<T> = (params?: FindParams) => Promise<T[]>
export type GetFunction<T> = (id: Id, params?: GetParams) => Promise<T>
export type CreateFunction<T> = (newItem: T) => Promise<T>
export type UpdateFunction<T> = (id: Id, newItem: T) => Promise<T>
export type PatchFunction<T> = (id: Id, newValues: Dict<any>) => Promise<T>
export type RemoveFunction<T> = (id: Id) => Promise<T>
export type IsLiveFunction = (id: Id) => Promise<boolean>
export type PublishFunction<T> = (id: Id) => Promise<T>
export type UnpublishFunction<T> = (id: Id) => Promise<T>
export type HistoryFunction = (id: Id) => Promise<IHistory[]>
export type PreviewFunction<T> = (id: Id, version: number) => Promise<T>
export type RestoreFunction<T> = (id: Id, version: number) => Promise<T>
export type SchemaFunction = () => Promise<JangleSchema>

export type ProtectedAnyFunction = (token: Token, params?: AnyParams) => Promise<boolean>
export type ProtectedCountFunction = (token: Token, params?: CountParams) => Promise<number>
export type ProtectedFindFunction<T> = (token: Token, params?: FindParams) => Promise<T[]>
export type ProtectedGetFunction<T> = (token: Token, id: Id, params?: GetParams) => Promise<T>
export type ProtectedCreateFunction<T> = (token: Token, newItem: T) => Promise<T>
export type ProtectedUpdateFunction<T> = (token: Token, id: Id, newItem: T) => Promise<T>
export type ProtectedPatchFunction<T> = (token: Token, id: Id, newValues: Dict<any>) => Promise<T>
export type ProtectedRemoveFunction<T> = (token: Token, id: Id) => Promise<T>
export type ProtectedIsLiveFunction = (token: Token, id: Id) => Promise<boolean>
export type ProtectedPublishFunction<T> = (token: Token, id: Id) => Promise<T>
export type ProtectedUnpublishFunction<T> = (token: Token, id: Id) => Promise<T>
export type ProtectedHistoryFunction = (token: Token, id: Id) => Promise<IHistory[]>
export type ProtectedPreviewFunction<T> = (token: Token, id: Id, version: number) => Promise<T>
export type ProtectedRestoreFunction<T> = (token: Token, id: Id, version: number) => Promise<T>
export type ProtectedSchemaFunction = (token: Token) => Promise<JangleSchema>

export type LiveService<T> = {
  any: AnyFunction
  count: CountFunction
  find: FindFunction<T>
  get: GetFunction<T>
}

export type MetaService<T> = {

  any: ProtectedAnyFunction
  count: ProtectedCountFunction
  find: ProtectedFindFunction<T>
  get: ProtectedGetFunction<T>

  create: ProtectedCreateFunction<T>
  update: ProtectedUpdateFunction<T>
  patch: ProtectedPatchFunction<T>
  remove: ProtectedRemoveFunction<T>

}

export type AuthenticatedService<T> = {

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
  preview: PreviewFunction<T>
  restore: RestoreFunction<T>

  schema: SchemaFunction

}

export type Service<T> = {

  any: ProtectedAnyFunction
  count: ProtectedCountFunction
  find: ProtectedFindFunction<T>
  get: ProtectedGetFunction<T>

  create: ProtectedCreateFunction<T>
  update: ProtectedUpdateFunction<T>
  patch: ProtectedPatchFunction<T>
  remove: ProtectedRemoveFunction<T>

  isLive: ProtectedIsLiveFunction
  publish: ProtectedPublishFunction<T>
  unpublish: ProtectedUnpublishFunction<T>

  history: ProtectedHistoryFunction
  preview: ProtectedPreviewFunction<T>
  restore: ProtectedRestoreFunction<T>

  schema: ProtectedSchemaFunction

  as: (token: Token) => AuthenticatedService<T>
  live: LiveService<T>

}

// Auth

export type SignInFunction = (email: string, password: string) => Promise<Token>
export type SignUpFunction = (token: string, user: IUser) => Promise<Token>
export type CreateInitialAdminFunction = (email: string, password: string) => Promise<Token>
export type HasInitialAdmin = () => Promise<boolean>

export type Jangle = {
  services: Dict<Service<Document>>
  auth: {
    User: MetaService<IUser>
    signIn: SignInFunction
    signUp: SignUpFunction
    createInitialAdmin: CreateInitialAdminFunction
    hasInitialAdmin: HasInitialAdmin
    token?: Token
  }
}