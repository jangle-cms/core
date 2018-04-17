import auth, { errors } from '../auth/index'
import { expect } from 'chai'
import 'mocha'
import { Config, Auth } from '../types'
import { Schema } from 'mongoose'
import models from '../models/index'

const fail = () => expect(true).to.be.false

describe('auth', () => {
  const config: Config = {
    mongo: {
      content: process.env.MONGO_TEST_URI || 'mongodb://localhost/jangle-test',
      live: process.env.MONGO_TEST_URI_LIVE || 'mongodb://localhost/jangle-test-live'
    },
    secret: 'some-secret',
    lists: {
      Example: new Schema({
        name: String,
        age: Number
      })
    },
    items: {}
  }
  const numberOfUserModels = Object.keys(config.lists).length
  const clearUserCollection = (models) =>
    models.jangleModels.User
      .remove({})
      .then(_ => models)

  const login = {
    email: 'test@jangle.com',
    password: 'password'
  }

  let Auth : Auth = undefined
  let Token = undefined

  before(() =>
    models.initialize({ config })
      .then(clearUserCollection)
      .then(auth.initialize)
      .then(auth => { Auth = auth })
  )

  it('still has user models', () =>
    expect(Auth.listModels.length).to.equal(numberOfUserModels)
  )

  it('still has jangle user model', () =>
    expect(Auth.jangleModels).to.haveOwnProperty('User')
  )

  describe('canSignUp', () => {
    it('can sign up initially', () =>
      Auth.auth.canSignUp()
        .then(canSignUp => {
          expect(canSignUp).to.be.true
        })
    )
  })

  describe('signUp', () => {

    it('disallows creation of invalid user', () =>
      Auth.auth.signUp({ name: 'Admin User', email: 'test@jangle.com', password: undefined })
        .then(fail)
        .catch(reason => {
          expect(reason).to.equal(errors.invalidUser)
        })
    )
  
    it('allows creation of valid user', () =>
      Auth.auth.signUp({ name: 'Admin User', email: login.email, password: login.password })
        .then(token => {
          Token = token
          expect(token).to.exist
        })
    )
  
    it('disallows creation after admin exists', () =>
      Auth.auth.signUp({ name: 'Admin', email: 'another@jangle.com', password: 'password' })
        .then(fail)
        .catch(reason => {
          expect(reason).to.equal(errors.adminExists)
        })
    )

  })

  describe('validate', () => {

    it('can get id from good token', () =>
      Auth.validate(Token)
        .then(id => expect(id).to.exist)
    )

    it('rejects bad tokens', () =>
      Auth.validate('garbage')
        .catch(reason =>
          expect(reason).to.equal(errors.invalidToken)
        )
    )

  })

  describe('signIn', () => {

    it('fails for bad email', () => 
      Auth.auth.signIn('bad@jangle.com', 'password')
        .catch(reason =>
          expect(reason).to.equal(errors.badLogin)
        )
    )

    it('fails for bad password', () => 
      Auth.auth.signIn('test@jangle.com', 'idk')
        .catch(reason =>
          expect(reason).to.equal(errors.badLogin)
        )
    )

    it('fails for garbage input', () => 
      Auth.auth.signIn(undefined, undefined)
        .catch(reason =>
          expect(reason).to.equal(errors.badLogin)
        )
    )

    it('returns same token on success', () =>
      Auth.auth.signIn(login.email, login.password)
        .then(token => {
          expect(token).to.equal(Token)
        })
    )

  })

})
