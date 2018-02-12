import models, { getConnections, getContentSchema, getLiveSchema } from '../src/models/index'
import { expect } from 'chai'
import 'mocha'
import { Connection, Schema, Model } from 'mongoose'
import { MongoUris } from '../src/types'
import Meta from '../src/models/schemas/Meta';

const uris: MongoUris = {
  content: process.env.MONGO_URI || 'mongodb://localhost/jangle-test',
  live: process.env.MONGO_URI_LIVE || 'mongodb://localhost/jangle-test-live',
}

const ExampleSchema = new Schema({
  name: String,
  age: Number
})

describe('models', () => {

  describe('getConnections', () => {
    it('creates connections from uris', () =>
      getConnections(uris)
        .then(connections => {
          expect(connections.content).to.exist
          expect(connections.content).instanceof(Connection)
          expect(connections.live).to.exist
          expect(connections.live).instanceof(Connection)
        })
    )
  })

  const schema = ExampleSchema as any
  const metaSchema = Meta as any
  
  const paths = Object.keys(schema.paths)
  const metaPaths = Object.keys(metaSchema.paths)
  
  describe('getContentSchema', () => {
    const contentSchema = getContentSchema(Meta, schema) as any
    const contentPaths = Object.keys(contentSchema.paths)
    
    it('does not modify provided schema', () => {
      expect(paths.length).to.equal(3)
      expect(contentPaths.length).to.equal(4)
    })

    it('adds jangle meta to schema', () => {
      expect(contentPaths).contains('jangle')
      const contentJanglePaths = Object.keys(contentSchema.paths.jangle.schema.paths)
      expect(metaPaths).to.eql(contentJanglePaths)
    })
  })

  
  describe('getLiveSchema', () => {
    const liveSchema = getLiveSchema(schema) as any
    const livePaths = Object.keys(liveSchema.paths)
    
    it('does not modify provided schema', () => {
      expect(schema).to.not.equal(liveSchema)
    })

    it('does not add jangle meta to schema', () => {
      expect(livePaths).does.not.contain('jangle')
    })
  })

  describe('initialize', () => {

    const schemas = { ExampleSchema }
    const metaModelNames = [ 'User' ]
    const initialSecret = 'some-secret'
    let result = undefined

    before(() =>
      models
        .initialize({
          config: {
            schemas,
            secret: initialSecret,
            mongo: uris
          }
        })
        .then(models => { result = models })
    )

    it('has secret that was provided', () => {
      expect(result.secret).to.equal(initialSecret)
    })

    it('has user model names that match schema keys', () => {
      const userModelNames = result.userModels.map(model => model.modelName)
      expect(userModelNames).to.eql(Object.keys(schemas))
    })

    it('has a content model', () => {
      const model = result.userModels.map(model => model.content)[0]
      expect(model).to.exist
      expect(model.update).to.be.a('function')
    })

    it('has a live model', () => {
      const model = result.userModels.map(model => model.live)[0]
      expect(model).to.exist
      expect(model.update).to.be.a('function')
    })

    it('has a history model', () => {
      const model = result.userModels.map(model => model.history)[0]
      expect(model).to.exist
      expect(model.modelName).contains('JangleHistory')
      expect(model.collection.name).contains('jangle.history.')
      expect(model.update).to.be.a('function')
    })

    it('has jangle models', () => {
      const jangleModelNames = Object.keys(result.jangleModels)
      expect(jangleModelNames).to.eql(metaModelNames)
    })

  })

})
