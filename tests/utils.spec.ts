import { debug, hash, encrypt, compare, isDictOf, parseConfigErrors, parseConfig, isValidUser, parseConfigAsUser, invalidUserErrors, authenticateService, authenticateServices, authenticateCore } from '../utils'
import { expect } from 'chai'
import 'mocha'
import { Config } from '../types'
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

    const secret = 'some secret'
    const otherSecret = 'some other secret'
    const value = 'some value'

    it('takes in a secret, returning a function', () => {
      expect(hash('secret')).to.be.a('function')
    })

    it('returns the same hash for the same secret', () => {
      expect(hash(secret)(value)).to.equal(hash(secret)(value))
    })

    it('returns a different hash for a different secret', () => {
      expect(hash(secret)(value)).to.not.equal(hash(otherSecret)(value))
    })

  })

  const password = 'some password'
  const otherPassword = 'some other password'

  // Encrypt
  describe('encrypt', () => {


    it('does not encrypt undefined', () =>
      encrypt(undefined as any)
        .then(_ => expect.fail)
        .catch(reason => expect(reason).to.exist)
    )

    it('encrypts a password', () =>
      encrypt(password)
        .then(hash => expect(hash).to.not.equal(password))
    )

    it('does not encrypt an object', () =>
      encrypt({} as any)
        .then(_ => expect.fail)
        .catch(reason => expect(reason).to.exist)
    )

  })

  // Compare
  describe('compare', () => {

    it('returns true for same password', () =>
      encrypt(password)
        .then(hash => compare(password, hash))
        .then(isMatch => expect(isMatch).to.be.true)
    )

    it('returns false for different password', () =>
      encrypt(password)
        .then(hash => compare(otherPassword, hash))
        .then(isMatch => expect(isMatch).to.be.false)
    )

    it('fails for missing hash', () =>
      compare('trash', undefined)
        .then(_ => expect.fail)
        .catch(reason => expect(reason).to.exist)
    )

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

  const baseConfig : Config = {
    mongo: {
      content: 'mongodb://base',
      live: 'mongodb://base-live'
    },
    lists: {},
    items: {},
    secret: 'default-secret'
  }

  const startsWith = (prefix, str) =>
    typeof str === 'string' && str.indexOf(prefix) === 0

  const isValidConfig = (config: Config) =>
    (config && typeof config === 'object' &&
    config.mongo &&
    startsWith('mongodb://', config.mongo.content) &&
    startsWith('mongodb://', config.mongo.live) &&
    config.lists && isDictOf(Schema, config.lists) &&
    config.items && isDictOf(Schema, config.items) &&
    typeof config.secret === 'string') || false

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

  // isValidConfig
  describe('isValidConfig', () => {
    Object.keys(exampleConfigs).map((key) => {
      const value = exampleConfigs[key]
      it(`isValidConfig ${value.expectation ? 'works' : 'breaks' } for ${key}`, () => {
        expect(isValidConfig(value.config)).to.equal(value.expectation)
      })
    })
  })

  // Parse Config
  describe('parseConfig', () => {

    const willHaveValidConfig = (config) =>
      parseConfig(config, baseConfig)
        .then(isValidConfig)

    const failsWithError = (config) =>
      parseConfig(config, baseConfig)
        .then(_ => 'Bad configuration succeeded...')
        .catch(reason => reason)

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

      // 'a bad list schema': {
      //   config: {
      //     mongo: {
      //       content: 'mongodb://new',
      //       live: 'mongodb://new-live'
      //     },
      //     lists: {
      //       BlogPost: 'bad schema'
      //     },
      //     secret: 'new-secret'
      //   },
      //   error: parseConfigErrors.badLists
      // },

      // 'a bad item schema': {
      //   config: {
      //     mongo: {
      //       content: 'mongodb://new',
      //       live: 'mongodb://new-live'
      //     },
      //     items: {
      //       BlogPost: 'bad schema'
      //     },
      //     secret: 'new-secret'
      //   },
      //   error: parseConfigErrors.badItems
      // },

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

  })

  const badUsers = {
    'null': {
      user: null,
      error: invalidUserErrors.noUserProvided
    },
    'undefined': {
      user: undefined,
      error: invalidUserErrors.noUserProvided
    },
    'an string': {
      user: 'pete',
      error: invalidUserErrors.notAnObject
    },
    'an number': {
      user: 1234,
      error: invalidUserErrors.notAnObject
    },
    'an array': {
      user: [],
      error: invalidUserErrors.notAnObject
    },
    'an empty object': {
      user: {},
      error: invalidUserErrors.missingEmail
    },
    'a missing email': {
      user: { password: '' },
      error: invalidUserErrors.missingEmail
    },
    'a missing password': {
      user: { email: '' },
      error: invalidUserErrors.missingPassword
    },
    'an invalid email': {
      user: { email: 123, password: '' },
      error: invalidUserErrors.invalidEmail
    },
    'an invalid password': {
      user: { email: '', password: 123 },
      error: invalidUserErrors.invalidPassword
    }
  }

  // isValidUser
  describe('isValidUser', () => {

    it('accepts a valid user', () =>
      isValidUser({
        email: 'ryan@jangle.com',
        password: 'password'
      }).then(user => expect(user).to.exist)
    )

    Object.keys(badUsers).map(key => {
      const value = badUsers[key]
      it(`provides correct error given ${key}`, () =>
        isValidUser(value.user)
          .catch(error => expect(error).to.equal(value.error))
      )
    })

  })

  // parseConfigAsUser
  describe('parseConfigAsUser', () => {

    it('returns a valid config, given a user', () =>
      parseConfigAsUser(
        { email: 'ryan@jangle.com', password: 'password' },
        undefined,
        baseConfig
      ).then(config => expect(isValidConfig(config)).to.be.true)
    )

    Object.keys(badUsers).map(key => {
      const value = badUsers[key]
      it(`provides correct error, given user ${key}`, () =>
        parseConfigAsUser(value.user, undefined, baseConfig)
          .catch(error => expect(error).to.equal(value.error))
      )
    })

  })

  const token = 'some-token'

  const functionsNeedingToken = [
    'any', 'count', 'get', 'find',
    'create', 'update', 'patch', 'remove',
    'isLive', 'publish', 'unpublish',
    'history', 'preview', 'restore', 'rollback',
    'schema'
  ]

  const makeEmptyFunction = () =>
    () => {}

  const fakeProtectedServiceMaker = () => {
    const service = functionsNeedingToken
      .reduce((service, name) => {
        service[name] = (token, ...params) => token
        return service
      }, {
        live: {
          any: makeEmptyFunction(),
          count: makeEmptyFunction(),
          get: makeEmptyFunction(),
          find: makeEmptyFunction()
        }
      })

    return {
      service
    }
  }

  // authenticateService
  describe('authenticateService', () => {
    const { service } = fakeProtectedServiceMaker()
    const protectedService = authenticateService(token, service as any)

    functionsNeedingToken.forEach(name => {
      const fn = protectedService[name]

      it(`creates ${name} function`, () => {
        expect(fn).to.be.a('function')
      })

      it(`passes token into ${name} function`, () => {
        const tokenFromFn = fn()
        expect(tokenFromFn).to.be.equal(token)
      })

    })
  })

  // authenticateServices
  describe('authenticateServices', () => {
    const fakeServices = [ 1, 2, 3, 4 ].map(fakeProtectedServiceMaker)
    const services = fakeServices.map(({ service }) => service)

    const protectedServices = authenticateServices(token, services as any)

    it('is an object of services', () => {
      expect(protectedServices).to.be.a('object')

      const isMadeOfObjects =
        Object.keys(protectedServices)
          .every(k => typeof protectedServices[k] === 'object')

      expect(isMadeOfObjects).to.be.true

    })

    it('has every service containing required functions', () => {
      const hasAllServiceFunctions =
        Object.keys(protectedServices)
          .map(k => protectedServices[k])
          .every(service => {
            const serviceFunctionNames = Object.keys(service)
            return functionsNeedingToken
              .every(name => serviceFunctionNames.indexOf(name) !== -1)
          })
      
      const allServicePropsAreFunctions =
        Object.keys(protectedServices)
          .map(k => protectedServices[k])
          .every(service =>
            Object.keys(service)
              .filter(key => key !== 'live')
              .map(key => typeof service[key])
              .every(type => type === 'function')
          )

      expect(hasAllServiceFunctions).to.be.true
      expect(allServicePropsAreFunctions).to.be.true
    })
  })

  describe('authenticateCore', () => {
    const auth = {
      admin: undefined,
      hasInitialAdmin () {
        return Promise.resolve(this.admin)
      },
      createInitialAdmin () {
        this.admin = { email: 'ryan@jangle.com', password: 'password' }
        return Promise.resolve('1234')
      },
      signIn (email, password) {
        return Promise.resolve('1234')
      },

    }

    it('works with no initial admin', () => {
      authenticateCore({ email: 'ryan@jangle.com', password: 'password' })({ auth, lists: {} })
        .then(({ auth, lists }) => {
          expect(auth).to.exist
          expect(lists).to.exist
        })
    })

    it('works with an initial admin', () => {
      authenticateCore({ email: 'ryan@jangle.com', password: 'password' })({ auth, lists: {} })
        .then(({ auth, lists }) => {
          expect(auth).to.exist
          expect(lists).to.exist
        })
    })

  })

})
