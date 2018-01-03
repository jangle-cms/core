import { hash, isDictOf, parseConfig, isValidUser, parseConfigAsUser } from './utils'
import { expect } from 'chai'
import 'mocha'

describe('hash', () => {

  it('is defined', () => expect(hash).to.exist)

  it('takes in a secret, returning a function', () => {
    expect(hash('secret')).to.be.a('function')
  })

  it('returns the same hash for the same secret', () => {
    const secret = 'some secret'
    const value = 'some value'
    expect(hash(secret)(value)).to.equal(hash(secret)(value))
  })

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
