import { Auth, ProtectedJangleCore } from '../types'

const initialize = ({ userModels }: Auth): Promise<ProtectedJangleCore> =>
  Promise.reject()

export default {
  initialize
}
