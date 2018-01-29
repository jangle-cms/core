import auth from '../src/auth/index'
import { expect } from 'chai'
import 'mocha'

describe('auth', () => {

  it('has an initialize method', () => {
    expect(auth.initialize).to.exist
  })

})
