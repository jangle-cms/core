import { Schema, ModelPopulateOptions } from 'mongoose'

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

export interface IItem {
  _id: any
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

export type SomeAnyFunction = (...params: any[]) => Promise<boolean>
export type SomeCountFunction = (...params: any[]) => Promise<number>
export type SomeFindFunction<T> = (...params: any[]) => Promise<T[]>
export type SomeGetFunction<T> = (...params: any[]) => Promise<T>
export type SomeCreateFunction<T> = (...params: any[]) => Promise<T>
export type SomeUpdateFunction<T> = (...params: any[]) => Promise<T>
export type SomePatchFunction<T> = (...params: any[]) => Promise<T>
export type SomeRemoveFunction<T> = (...params: any[]) => Promise<T>
export type SomeIsLiveFunction = (...params: any[]) => Promise<boolean>
export type SomePublishFunction<T> = (...params: any[]) => Promise<T>
export type SomeUnpublishFunction<T> = (...params: any[]) => Promise<T>
export type SomeHistoryFunction = (...params: any[]) => Promise<IHistory[]>
export type SomePreviewFunction<T> = (...params: any[]) => Promise<T>
export type SomeRestoreFunction<T> = (...params: any[]) => Promise<T>
export type SomeSchemaFunction = (...params: any[]) => Promise<JangleSchema>

export interface IReadableService<T> {
  any: SomeAnyFunction
  count: SomeCountFunction
  find: SomeFindFunction<T>
  get: SomeGetFunction<T>
}

export interface IUpdatableService<T> extends IReadableService<T> {
  create: SomeCreateFunction<T>
  update: SomeUpdateFunction<T>
  patch: SomePatchFunction<T>
  remove: SomeRemoveFunction<T>
}

export interface IJangleService<T> extends IUpdatableService<T> {

  isLive: SomeIsLiveFunction
  publish: SomePublishFunction<T>
  unpublish: SomeUnpublishFunction<T>

  history: SomeHistoryFunction
  preview: SomePreviewFunction<T>
  restore: SomeRestoreFunction<T>

  schema: SomeSchemaFunction

  live: LiveService

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

export class LiveService implements IReadableService<IItem> {
  any: AnyFunction
  count: CountFunction
  find: FindFunction<IItem>
  get: GetFunction<IItem>
}

export class MetaService<T> implements IUpdatableService<T> {

  any: ProtectedAnyFunction
  count: ProtectedCountFunction
  find: ProtectedFindFunction<T>
  get: ProtectedGetFunction<T>

  create: ProtectedCreateFunction<T>
  update: ProtectedUpdateFunction<T>
  patch: ProtectedPatchFunction<T>
  remove: ProtectedRemoveFunction<T>

}

export class Service<T> implements IJangleService<T> {

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

  live: LiveService

}

export class AuthenticatedMetaService<T> implements IUpdatableService<T> {

  any: AnyFunction
  count: CountFunction
  find: FindFunction<T>
  get: GetFunction<T>

  create: CreateFunction<T>
  update: UpdateFunction<T>
  patch: PatchFunction<T>
  remove: RemoveFunction<T>

}

export class AuthenticatedService<T> implements IJangleService<T> {

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

  live: LiveService

}

// Auth

export type SignInFunction = (email: string, password: string) => Promise<Token>
export type SignUpFunction = (token: string, user: IUser) => Promise<Token>
export type CreateInitialAdminFunction = (email: string, password: string) => Promise<Token>
export type HasInitialAdmin = () => Promise<boolean>

// Configuration

export interface JangleConfig {
  mongo: {
    content: MongoUri
    live: MongoUri
  }
  schemas: Dict<Schema>
  secret: string
}

export class JangleConfigAsUser implements JangleConfig {
  mongo: {
    content: MongoUri
    live: MongoUri
  }
  schemas: Dict<Schema>
  secret: string
  user: {
    email: string
    password: string
  }
}

// Return values

export type JangleCore = {
  services: Dict<Service<IJangleItem>>
  auth: {
    User: MetaService<IUser>
    signIn: SignInFunction
    signUp: SignUpFunction
    createInitialAdmin: CreateInitialAdminFunction
    hasInitialAdmin: HasInitialAdmin
  }
}

export type JangleCoreAsUser = {
  services: Dict<AuthenticatedService<IJangleItem>>
  auth: {
    User: AuthenticatedMetaService<IUser>
    signIn: SignInFunction
    signUp: SignUpFunction
    createInitialAdmin: CreateInitialAdminFunction
    hasInitialAdmin: HasInitialAdmin
  }
}