import jangle from '../src/index'
import { expect } from 'chai'
import 'mocha'

describe('jangle', () => {

  it('has a start method', () => {
    expect(jangle.start).to.exist
  })

})
