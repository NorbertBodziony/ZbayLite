import Immutable from 'immutable'
import { createAction, handleActions } from 'redux-actions'

import vaultHandlers from './vault'
import identityHandlers from './identity'
import vaultCreatorSelectors from '../selectors/vaultCreator'

export const VaultCreatorState = Immutable.Record({
  password: '',
  repeat: '',
  passwordVisible: false,
  repeatVisible: false
}, 'VaultCreatorState')

const initialState = VaultCreatorState({
  password: '',
  repeat: '',
  passwordVisible: false,
  repeatVisible: false
})

const setPassword = createAction('SET_CREATOR_PASSWORD', e => e.target.value)
const setRepeat = createAction('SET_CREATOR_REPEAT', e => e.target.value)
const togglePasswordVisibility = createAction('TOGGLE_CREATOR_PASSWORD')
const toggleRepeatVisibility = createAction('TOGGLE_CREATOR_REPEAT')
const clearCreator = createAction('CLEAR_CREATOR')

const createVault = () => async (dispatch, getState) => {
  dispatch(vaultHandlers.actions.clearError())
  const state = getState()
  const repeat = vaultCreatorSelectors.repeat(state)
  const password = vaultCreatorSelectors.password(state)
  if (repeat !== password) {
    dispatch(clearCreator())
    throw Error('Can\'t create vault, passwords don\'t match.')
  }
  try {
    await dispatch(vaultHandlers.actions.createVault({ masterPassword: password }))
    await dispatch(vaultHandlers.actions.unlockVault({ masterPassword: password, createSource: true }))
    const identity = await dispatch(identityHandlers.epics.createIdentity())
    await dispatch(identityHandlers.epics.setIdentity(identity))
  } catch (err) {
  } finally {
    dispatch(clearCreator())
  }
}

const reducer = handleActions({
  [togglePasswordVisibility]: state => state.set(
    'passwordVisible',
    !state.passwordVisible
  ),
  [toggleRepeatVisibility]: state => state.set(
    'repeatVisible',
    !state.repeatVisible
  ),
  [setPassword]: (state, { payload: password }) => state.set('password', password),
  [setRepeat]: (state, { payload: repeat }) => state.set('repeat', repeat),
  [clearCreator]: state => state.clear()
}, initialState)

export const actions = {
  setPassword,
  setRepeat,
  togglePasswordVisibility,
  toggleRepeatVisibility,
  clearCreator
}

export const epics = {
  createVault
}

export default {
  actions,
  epics,
  reducer
}
