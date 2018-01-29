import models from '../src/models/index'
import { expect } from 'chai'
import 'mocha'

describe('models', () => {

  it('has an initialize method', () => {
    expect(models.initialize).to.exist
  })

})
