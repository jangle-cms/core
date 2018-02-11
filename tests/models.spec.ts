import models, { getConnections, getContentSchema, getLiveSchema } from '../src/models/index'
import { expect } from 'chai'
import 'mocha'
import { Connection, Schema } from 'mongoose'
import { MongoUris } from '../src/types'
import Meta from '../src/models/schemas/Meta';

// TODO: Find a way to test MongoDB in TravisCI
const ignoreErrorInProduction = (reason) =>
  process.env.NODE_ENV !== 'production'
    ? Promise.reject(reason)
    : undefined

const uris: MongoUris = {
  content: process.env.MONGO_URI || 'mongodb://localhost/jangle-test',
  live: process.env.MONGO_URI || 'mongodb://localhost/jangle-test-live',
}

describe('models', () => {

  it('has an initialize method', () => {
    expect(models.initialize).to.exist
  })

  describe('getConnections', () => {
    it('creates connections from uris', () =>
      getConnections(uris)
        .then(connections => {
          expect(connections.content).to.exist
          expect(connections.content).instanceof(Connection)
          expect(connections.live).to.exist
          expect(connections.live).instanceof(Connection)
        })
        .catch(ignoreErrorInProduction)
    )
  })

  const ExampleSchema = new Schema({
    name: String,
    age: Number
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

})
