import auth, { errors as authErrors } from '../auth/index'
import { expect } from 'chai'
import 'mocha'
import { Config, Auth, ProtectedJangleCore, IJangleItem } from '../types'
import { Schema } from 'mongoose'
import * as mongoose from 'mongoose'
import models, { getConnections } from '../models/index'
import services, { errors } from '../services/index'
import { ObjectId } from 'bson'
import { debug } from '../utils'

const fail = () => Promise.reject('Operation succeeded...')

describe('core', () => {
  const config: Config = {
    mongo: {
      content: process.env.MONGO_TEST_URI || 'mongodb://localhost/jangle-test',
      live: process.env.MONGO_TEST_URI_LIVE || 'mongodb://localhost/jangle-test-live'
    },
    secret: 'some-secret',
    lists: {
      Example: new Schema({
        name: {
          type: String,
          required: true
        },
        age: Number
      }),
      AnotherExample: new Schema({
        title: String
      })
    },
    items: {}
  }
  const numberOfUserModels = Object.keys(config.lists).length

  const dropCollections = (uri) =>
    new Promise((resolve, reject) => {
      mongoose.connect(uri, function (err) {
        if (err) {
          reject(err)
        } else {
          mongoose.connection.db.dropDatabase()
          resolve()
        }
      })
    })

  const clearAllCollections = () =>
    Promise.all([
      dropCollections(config.mongo.content),
      dropCollections(config.mongo.live)
    ])
      .catch(console.error)

  const login = {
    email: 'test@jangle.com',
    password: 'password'
  }

  let Jangle : ProtectedJangleCore = undefined
  let Token = undefined

  before(() =>
    clearAllCollections()
      .then(_ => models.initialize({ config }))
      .then(auth.initialize)
      .then(services.initialize)
      .then(core => { Jangle = core })
  )

  it('exposes auth', () => {
    expect(Jangle.auth).to.exist
  })

  it('exposes services', () => {
    expect(Jangle.lists).to.exist
  })

  describe('auth', () => {

    it('allows sign up', () =>
      Jangle.auth.signUp({ name: 'Admin User', email: login.email, password: login.password })
        .then(token => {
          Token = token
          expect(token).to.be.a('string')
        })
    )

    it('allows sign in', () =>
      Jangle.auth.signIn(login.email, login.password)
        .then(token => {
          expect(token).to.equal(Token)
        })
    )

  })

  describe('services', () => {

    it('has a service for each schema', () => {
      expect(Jangle.lists.Example).to.exist
      expect(Jangle.lists.AnotherExample).to.exist
    })
  
    it('has all read functions', () => {
      const Example = Jangle.lists.Example
      expect(Example.any).to.be.a('function')
      expect(Example.count).to.be.a('function')
      expect(Example.find).to.be.a('function')
      expect(Example.get).to.be.a('function')
    })
  
    it('has all write functions', () => {
      const Example = Jangle.lists.Example
      expect(Example.create).to.be.a('function')
      expect(Example.update).to.be.a('function')
      expect(Example.patch).to.be.a('function')
      expect(Example.remove).to.be.a('function')
    })
  
    it('has all publish functions', () => {
      const Example = Jangle.lists.Example
      expect(Example.publish).to.be.a('function')
      expect(Example.unpublish).to.be.a('function')
      expect(Example.isLive).to.be.a('function')
    })
  
    it('has all history functions', () => {
      const Example = Jangle.lists.Example
      expect(Example.history).to.be.a('function')
      expect(Example.previewRollback).to.be.a('function')
      expect(Example.rollback).to.be.a('function')
    })
  
    it('has a live service', () => {
      const Example = Jangle.lists.Example
      const LiveExample = Example.live
  
      expect(Example.live).to.exist
      expect(LiveExample.any).to.be.a('function')
      expect(LiveExample.count).to.be.a('function')
      expect(LiveExample.find).to.be.a('function')
      expect(LiveExample.get).to.be.a('function')
    })

  })

  describe('any', () => {

    it('requires a token', () =>
      Jangle.lists.Example.any(undefined)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('returns a boolean', () =>
      Jangle.lists.Example.any(Token)
        .then(hasAny => expect(hasAny).to.be.a('boolean'))
    )

    it('works without params', () =>
      Jangle.lists.Example.any(Token)
    )

    it('accepts empty params', () =>
      Jangle.lists.Example.any(Token, {})
    )

    it('accepts params with where clause', () =>
      Jangle.lists.Example.any(Token, { where: { name: 'Ryan' } })
    )

  })

  describe('count', () => {

    it('requires a token', () =>
      Jangle.lists.Example.count(undefined)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('returns a number', () =>
      Jangle.lists.Example.count(Token)
        .then(count => expect(count).to.be.a('number'))
    )

    it('works without params', () =>
      Jangle.lists.Example.count(Token)
    )

    it('accepts empty params', () =>
      Jangle.lists.Example.count(Token, {})
    )

    it('accepts params with where clause', () =>
      Jangle.lists.Example.count(Token, { where: { name: 'Ryan' } })
    )

  })

  describe('find', () => {

    it('requires a token', () =>
      Jangle.lists.Example.find(undefined)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('returns a list of items', () =>
      Jangle.lists.Example.find(Token)
        .then(items => {
          expect(items).to.be.an.instanceOf(Array)
        })
    )

    it('works without params', () =>
      Jangle.lists.Example.find(Token)
    )

    it('accepts empty params', () =>
      Jangle.lists.Example.find(Token, {})
    )

    it('accepts params with where clause', () =>
      Jangle.lists.Example.find(Token, { where: { name: 'Ryan' } })
    )

    it('accepts params with multiple clauses', () =>
      Jangle.lists.Example.find(Token, {
        where: { name: 'Ryan' },
        skip: 0,
        limit: 1,
        select: 'name'
      })
    )

  })

  describe('get', () => {

    const someId = new ObjectId()

    it('requires a token', () =>
      Jangle.lists.Example.get(undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.get(Token, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('returns a single item', () =>
      Jangle.lists.Example.get(Token, someId)
        .then(item => {
          expect(item).to.not.be.an.instanceOf(Array)
          expect(item).to.not.exist
        })
    )

    it('accepts empty params', () =>
      Jangle.lists.Example.get(Token, someId, {})
    )

    it('accepts params with select clause', () =>
      Jangle.lists.Example.get(Token, someId, { select: 'name' })
    )

  })

  let Item : IJangleItem = undefined
  let UpdateReturnedItem : IJangleItem = undefined
  let PatchReturnedItem : IJangleItem = undefined
  let RemovedItem : IJangleItem = undefined
  let RestoredItem : IJangleItem = undefined
  let PublishedItem : any = undefined
  let UnpublishedItem : any = undefined

  describe('create', () => {

    const someId = new ObjectId()

    const validItem = { name: 'Ryan', age: 24 }
    const invalidItem = { age: 24 }

    before(() =>
      Jangle.lists.Example.create(Token, validItem)
        .then(item => { Item = item })
    )

    it('requires a token', () =>
      Jangle.lists.Example.create(undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('enforces required fields', () =>
      Jangle.lists.Example.create(Token, invalidItem)
        .then(fail)
        .catch(reason => expect(reason).to.exist)
    )

    it('returns a single item', () => {
      expect(Item).to.not.be.an.instanceOf(Array)
      expect(Item).to.exist
      expect(Item._id).to.exist
    })

    it('creates jangle meta', () => {
      expect(Item.jangle).to.exist
      expect(Item.jangle.version).to.equal(1)
      expect(Item.jangle.created).to.exist
      expect(Item.jangle.created.by).to.eql(Item.jangle.updated.by)
    })

  })

  describe('update', () => {

    const validUpdate = { name: 'Ryan', age: 25 }
    const invalidUpdate = { age: 25 }

    before(() =>
      Jangle.lists.Example.update(Token, Item._id, validUpdate)
        .then(item => { UpdateReturnedItem = item })
    )

    it('requires a token', () =>
      Jangle.lists.Example.update(undefined, undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.update(Token, undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('requires an item', () =>
      Jangle.lists.Example.update(Token, Item._id, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingItem))
    )

    it('enforces required fields', () =>
      Jangle.lists.Example.update(Token, Item._id, invalidUpdate)
        .then(fail)
        .catch(reason => expect(reason).to.exist)
    )

    it('returns the old item', () => {
      expect(UpdateReturnedItem).to.eql(Item)
    })

  })

  describe('patch', () => {

    const validPatch = { age: 26 }

    before(() =>
      Jangle.lists.Example.patch(Token, Item._id, validPatch)
        .then(item => { PatchReturnedItem = item })
    )

    it('requires a token', () =>
      Jangle.lists.Example.patch(undefined, undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.patch(Token, undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('requires an item', () =>
      Jangle.lists.Example.patch(Token, Item._id, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingItem))
    )

    it('returns the old item', () => {
      expect(PatchReturnedItem).to.exist
      expect(PatchReturnedItem.jangle).to.exist
      expect(PatchReturnedItem.jangle.version).to.equal(2)
    })

  })

  describe('remove', () => {

    before(() => 
      Jangle.lists.Example.remove(Token, Item._id)
        .then(item => { RemovedItem = item })
    )

    it('requires a token', () =>
      Jangle.lists.Example.remove(undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.remove(Token, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('removes item from the collection', () =>
      Jangle.lists.Example.any(Token)
        .then(hasAny => expect(hasAny).to.be.false)
    )

    it('stores the full old item in the history collection', () =>
      Jangle.lists.Example.history(Token, Item._id)
        .then(items => items[0])
        .then((firstItem) => {
          expect(firstItem.changes).to.exist
          expect(firstItem.changes.length).to.equal(2)
        })
    )

    it('returns the old item', () => {
      expect(RemovedItem).to.exist
      expect(RemovedItem.jangle).to.exist
      expect(RemovedItem.jangle.version).to.equal(3)
    })

  })

  describe('restore', () => {

    before(() =>
      Jangle.lists.Example.rollback(Token, Item._id)
        .then(item => { RestoredItem = item })
        .catch(console.error)
    )

    it('requires a token', () =>
      Jangle.lists.Example.rollback(undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.rollback(Token, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('returns the restored item', () => {
      expect(RestoredItem).to.exist
      expect(RestoredItem.jangle).to.exist
      expect(RestoredItem.jangle.version).to.equal(5)
    })

  })

  describe('isLive', () => {

    it('requires a token', () =>
      Jangle.lists.Example.isLive(undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.isLive(Token, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('returns false before publish', () => {
      Jangle.lists.Example.isLive(Token, Item._id)
        .then(isLive => expect(isLive).to.be.false)
    })

  })

  describe('publish', () => {

    it('requires a token', () =>
      Jangle.lists.Example.publish(undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.publish(Token, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('returns the published item', () =>
      Jangle.lists.Example.publish(Token, Item._id)
        .then((item : any) => {
          expect(item.name).to.exist
          expect(item.age).to.exist
          expect(item.jangle).to.not.exist
        })
    )

  })

  describe('isLive', () => {

    it('returns true after publish', () => {
      Jangle.lists.Example.isLive(Token, Item._id)
        .then(isLive => expect(isLive).to.be.true)
    })

  })

  describe('unpublish', () => {

    it('requires a token', () =>
      Jangle.lists.Example.unpublish(undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.unpublish(Token, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('returns the unpublished item', () =>
      Jangle.lists.Example.unpublish(Token, Item._id)
        .then((item : any) => {
          expect(item.name).to.exist
          expect(item.age).to.exist
          expect(item.jangle).to.not.exist
        })
    )

  })

  describe('isLive', () => {

    it('returns false after unpublish', () => {
      Jangle.lists.Example.isLive(Token, Item._id)
        .then(isLive => expect(isLive).to.be.false)
    })

  })

  describe('history', () => {

    it('requires a token', () =>
      Jangle.lists.Example.history(undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.history(Token, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('sorts by version, descending', () =>
      Jangle.lists.Example.history(Token, Item._id)
        .then(items => items.map(({ version }) => version))
        .then(versions => versions
          .reduce(({ isDescending, lastNumber }, number) =>
            (lastNumber !== undefined && lastNumber < number)
              ? { isDescending: false, lastNumber }
              : { isDescending, lastNumber: number }
          , { isDescending: true, lastNumber: undefined })
        )
        .then(({ isDescending }) => expect(isDescending).to.be.true)
    )

    it('returns three old versions', () =>
      Jangle.lists.Example.history(Token, Item._id)
        .then(items => expect(items).to.have.length(3))
    )

  })

  describe('previewRollback', () => {

    it('requires a token', () =>
      Jangle.lists.Example.previewRollback(undefined, undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.previewRollback(Token, undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('requires a positive version number', () =>
      Jangle.lists.Example.previewRollback(Token, Item._id, 0)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.negativeVersionNumber))
    )

    it('returns a preview of the rollback', () =>
      Jangle.lists.Example.previewRollback(Token, Item._id, 1)
        .then((item : any) => {
          expect(item).to.exist
          expect(item.name).to.exist
          expect(item.age).to.exist
          expect(item.jangle).to.exist
          expect(item.jangle.version).to.equal(6)
        })
    )

    it('does not actually rollback', () =>
      Jangle.lists.Example.previewRollback(Token, Item._id, 1)
        .then((item : any) => {
          expect(item).to.exist
          expect(item.jangle).to.exist
          expect(item.jangle.version).to.equal(6)
        })
    )

    it('has same values as first version', () =>
      Jangle.lists.Example.previewRollback(Token, Item._id, 1)
        .then((item : any) => {
          let initialItem : any = Item
          expect(item.name).to.equal(initialItem.name)
          expect(item.age).to.equal(initialItem.age)
        })
    )

  })


  describe('rollback', () => {

    it('requires a token', () =>
      Jangle.lists.Example.rollback(undefined, undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an _id', () =>
      Jangle.lists.Example.rollback(Token, undefined, undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.missingId))
    )

    it('requires a positive version number', () =>
      Jangle.lists.Example.rollback(Token, Item._id, 0)
        .then(fail)
        .catch(reason => expect(reason).to.equal(errors.negativeVersionNumber))
    )

    it('returns old item on rollback', () =>
      Jangle.lists.Example.rollback(Token, Item._id, 1)
        .then((item : any) => {
          expect(item).to.exist
          expect(item.name).to.exist
          expect(item.age).to.exist
          expect(item.jangle).to.exist
          expect(item.jangle.version).to.equal(5)
        })
    )

    it('created a new version after rollback', () =>
      Jangle.lists.Example.get(Token, Item._id)
        .then(item => expect(item.jangle.version).to.equal(6))
    )

  })


  describe('schema', () => {

    it('requires a token', () =>
      Jangle.lists.Example.schema(undefined)
        .then(fail)
        .catch(reason => expect(reason).to.equal(authErrors.invalidToken))
    )

    it('requires an item with both fields', () =>
      Jangle.lists.Example.schema(Token)
        .then(schema => {
          expect(schema.name).to.exist
          expect(schema.labels).to.exist
          expect(schema.fields).to.exist
        })
    )

  })

})
