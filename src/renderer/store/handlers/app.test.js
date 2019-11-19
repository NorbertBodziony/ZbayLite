/* eslint import/first: 0 */
jest.mock('electron', () => {
  const remote = jest.mock()
  remote.app = jest.mock()
  remote.process = jest.mock()
  remote.process.on = jest.fn()
  remote.app.getVersion = jest.fn().mockReturnValue('0.13.37')
  return { remote }
})

import Immutable from 'immutable'
import { remote } from 'electron'

import handlers, { AppState } from './app'
import selectors from '../selectors/app'
import create from '../create'

describe('criticalError reducer', () => {
  let store = null
  beforeEach(() => {
    store = create({
      initialState: Immutable.Map({
        app: AppState()
      })
    })
    remote.app = jest.mock()
    jest.clearAllMocks()
  })

  describe('handles actions -', () => {
    it('loadVersion', () => {
      store.dispatch(handlers.actions.loadVersion())

      expect(selectors.version(store.getState())).toMatchSnapshot()
    })

    it('set transfers', () => {
      store.dispatch(handlers.actions.setTransfers({ id: 'testid', value: 'testvalue' }))
      expect(selectors.transfers(store.getState())).toMatchSnapshot()
    })

    it('overwrite transfers with same id', () => {
      store.dispatch(handlers.actions.setTransfers({ id: 'testid', value: 'testvalue' }))
      store.dispatch(handlers.actions.setTransfers({ id: 'testid', value: 'testvalue2' }))
      expect(selectors.transfers(store.getState()).get('testid')).toEqual('testvalue2')
    })
    it('set newUser', () => {
      store.dispatch(handlers.actions.setNewUser(true))
      expect(selectors.newUser(store.getState())).toMatchSnapshot()
    })
  })
})
