import { debug, hash, isDictOf, parseConfigErrors, parseConfig, isValidUser, parseConfigAsUser } from './utils'
import { expect } from 'chai'
import 'mocha'
import { Config } from './types'
import { Schema } from 'mongoose'

describe('utils', () => {
  // Debug
  describe('debug', () => {
    // Disable logging
    const log = console.log

    let logCalled = false
    console.log = () => { logCalled = true }

    const thing = 123
    const debugThing = debug(thing)

    // Restore logging
    console.log = log

    it('calls console log', () => {
      expect(logCalled).to.equal(true)
    })

    it('returns its input', () => {
      expect(debugThing).to.equal(thing)
    })

  })

  // Hash
  describe('hash', () => {

    it('takes in a secret, returning a function', () => {
      expect(hash('secret')).to.be.a('function')
    })

    it('returns the same hash for the same secret', () => {
      const secret = 'some secret'
      const value = 'some value'
      expect(hash(secret)(value)).to.equal(hash(secret)(value))
    })

  })

  describe('isDictOf', () => {
    const all = {
      thing: [],
      otherThing: []
    }

    const some = {
      thing: 123,
      otherThing: []
    }

    const none = {
      thing: 123,
      otherThing: 'thing'
    }

    it('works with empty', () => {
      expect(isDictOf(Array, {})).to.equal(true)
    })

    it('works with all', () => {
      expect(isDictOf(Array, all)).to.equal(true)
    })

    it('breaks with some', () => {
      expect(isDictOf(Array, some)).to.equal(false)
    })

    it('breaks with none', () => {
      expect(isDictOf(Array, none)).to.equal(false)
    })

    it('breaks with null', () => {
      expect(isDictOf(Array, null)).to.equal(false)
    })
  })

  // Parse Config
  describe('parseConfig', () => {

    const startsWith = (prefix, str) =>
      typeof str === 'string' && str.indexOf(prefix) === 0

    const isValidConfig = (config) =>
      (config && typeof config === 'object' &&
      config.mongo &&
      startsWith('mongodb://', config.mongo.content) &&
      startsWith('mongodb://', config.mongo.live) &&
      config.schemas && isDictOf(Schema, config.schemas) &&
      typeof config.secret === 'string') || false

    const willHaveValidConfig = (config) =>
      parseConfig(config, baseConfig)
        .then(isValidConfig)

    const failsWithError = (config) =>
      parseConfig(config, baseConfig)
        .then(_ => 'Bad configuration succeeded...')
        .catch(reason => reason)

    const baseConfig : Config = {
      mongo: {
        content: 'mongodb://base',
        live: 'mongodb://base-live'
      },
      schemas: {},
      secret: 'default-secret'
    }

    const shouldFailWithError = {

      'a string': {
        config: '',
        error: parseConfigErrors.notAnObjectOrUndefined
      },

      'a number': {
        config: 123,
        error: parseConfigErrors.notAnObjectOrUndefined
      },

      'a array': {
        config: [],
        error: parseConfigErrors.notAnObjectOrUndefined
      },

      'a bad schema': {
        config: {
          mongo: {
            content: 'mongodb://new',
            live: 'mongodb://new-live'
          },
          schemas: {
            BlogPost: 'bad schema'
          },
          secret: 'new-secret'
        },
        error: parseConfigErrors.badSchemas
      },

      'a bad content uri': {
        config: {
          mongo: {
            content: 'trash',
            live: 'mongodb://new-live'
          },
          schemas: {
            BlogPost: 'bad schema'
          },
          secret: 'new-secret'
        },
        error: parseConfigErrors.badContentUri
      },

      'a bad live uri': {
        config: {
          mongo: {
            content: 'mongodb://new',
            live: 'trash'
          },
          schemas: {
            BlogPost: 'bad schema'
          },
          secret: 'new-secret'
        },
        error: parseConfigErrors.badLiveUri
      },

      'a bad secret': {
        config: {
          mongo: {
            content: 'mongodb://new',
            live: 'mongodb://live'
          },
          schemas: {},
          secret: []
        },
        error: parseConfigErrors.badSecret
      }

    }

    const shouldPass = {

      'undefined': undefined,

      'an empty object': {},

      'a mongo config': {
        mongo: {
          content: 'mongodb://new',
          live: 'mongodb://new-live'
        }
      },

      'a mongo content uri': {
        mongo: {
          content: 'mongodb://new'
        }
      },

      'a mongo live uri': {
        mongo: {
          live: 'mongodb://new-live'
        }
      },

      'empty schemas': {
        schemas: {}
      },

      'schemas': {
        schemas: {
          BlogPost: new Schema({ title: String })
        }
      },

      'a secret': {
        secret: 'new-secret'
      },

      'a full config': {
        mongo: {
          content: 'mongodb://new',
          live: 'mongodb://new-live'
        },
        schemas: {
          BlogPost: new Schema({ title: String })
        },
        secret: 'new-secret'
      }

    }

    const exampleConfigs = {
      'the base config': {
        config: baseConfig,
        expectation: true
      },
      'undefined': {
        config: undefined,
        expectation: false
      },
      'an empty object': {
        config: {},
        expectation: false
      }
    }

    Object.keys(exampleConfigs).map((key) => {
      const value = exampleConfigs[key]
      it(`isValidConfig ${value.expectation ? 'works' : 'breaks' } for ${key}`, () => {
        expect(isValidConfig(value.config)).to.equal(value.expectation)
      })
    })

    Object.keys(shouldFailWithError).map((key) => {
      const value = shouldFailWithError[key]
      it(`provides correct error message for ${key}`, () =>
        failsWithError(value.config)
          .then(error => expect(error).to.equal(value.error))
      )
    })

    Object.keys(shouldPass).map((key) => {
      const value = shouldPass[key]
      it(`creates valid config when given ${key}`, () =>
        willHaveValidConfig(value)
          .then(isValid => expect(isValid).to.be.true)
      )
    })

    // it('works for valid configs', (done) =>
    //   Promise.all(
    //     Object.keys(shouldPass).map(key => willHaveValidConfig(shouldPass[key]))
    //   )
    //     .then(results =>
    //       results.forEach(result => expect(result).to.be.true)
    //     )
    //     .then(done)
    //     .catch(done)
    // )

  })

  describe('isValidUser', () => {

    it('is defined', () => expect(isValidUser).to.exist)

    it('accepts valid users', () => {
      expect(isValidUser({
        email: 'ryan@jangle.com',
        password: 'password'
      })).to.be.true
    })

    it('rejects invalid users', () => {
      expect(isValidUser(null as any)).to.be.false
      expect(isValidUser(undefined as any)).to.be.false
      expect(isValidUser({ email: 'ryan@jangle.com', password: undefined } as any)).to.be.false
      expect(isValidUser({ email: undefined, password: 'password' } as any)).to.be.false
      expect(isValidUser({} as any)).to.be.false
      expect(isValidUser({ email: 'poop input', password: 123 } as any)).to.be.false
    })

  })

})
