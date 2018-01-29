import services from '../src/services/index'
import { expect } from 'chai'
import 'mocha'

describe('services', () => {

  it('has an initialize method', () => {
    expect(services.initialize).to.exist
  })

})
