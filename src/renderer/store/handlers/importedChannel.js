import Immutable from 'immutable'
import { createAction, handleActions } from 'redux-actions'

import { uriToChannel } from '../../zbay/channels'
import { errorNotification } from './utils'
import identitySelectors from '../selectors/identity'
import channelSelectors from '../selectors/channel'
import channelsSelectors from '../selectors/channels'
import identityHandlers from '../handlers/identity'
import logsHandlers from '../handlers/logs'
import importedChannelSelectors from '../selectors/importedChannel'
import channelsHandlers from './channels'
import notificationsHandlers from './notifications'
import { getClient } from '../../zcash'
import channels from '../../zcash/channels'
import nodeSelectors from '../selectors/node'
import modalsHandlers from './modals'
import { actionTypes } from '../../../shared/static'
import history from '../../../shared/history'
import electronStore from '../../../shared/electronStore'

export const ImportedChannelState = Immutable.Record(
  {
    data: null,
    decoding: false,
    errors: ''
  },
  'ImportedChannelState'
)

const initialState = ImportedChannelState()

const setData = createAction(actionTypes.SET_DECODED_CHANNEL)
const setDecoding = createAction(actionTypes.SET_DECODING_CHANNEL)
const setDecodingError = createAction(actionTypes.SET_DECODING_ERROR)
const clear = createAction(actionTypes.CLEAR_CHANNEL)

const actions = {
  clear,
  setData,
  setDecoding,
  setDecodingError
}

const removeChannel = (history, isOffer = false) => async (dispatch, getState) => {
  const state = getState()
  const channel = channelSelectors.channel(state).toJS()
  try {
    const network = nodeSelectors.network(getState())

    const generalChannel = channels.general[network]
    if (generalChannel.address !== channel.address) {
      if (isOffer) {
        electronStore.set(`removedChannels.${channel.id}`, channel)
      } else {
        electronStore.set(`removedChannels.${channel.address}`, channel)
      }
      const removedChannels = electronStore.get('removedChannels')
      dispatch(identityHandlers.actions.setRemovedChannels(Immutable.fromJS(Object.keys(removedChannels))))
      history.push(`/main/channel/${channelsSelectors.generalChannelId(state)}`)
      dispatch(
        notificationsHandlers.actions.enqueueSnackbar({
          message: `Successfully removed channel`,
          options: {
            variant: 'success'
          }
        })
      )
      dispatch(
        logsHandlers.epics.saveLogs({
          type: 'APPLICATION_LOGS',
          payload: `Removing channel ${channel.address}`
        })
      )
    } else {
      dispatch(
        notificationsHandlers.actions.enqueueSnackbar({
          message: 'General channel cannot be removed',
          options: {
            variant: 'error'
          }
        })
      )
    }
  } catch (err) {
    dispatch(
      notificationsHandlers.actions.enqueueSnackbar({
        message: err.message,
        options: {
          variant: 'error'
        }
      })
    )
  }
}

const importChannel = () => async (dispatch, getState) => {
  const state = getState()
  const identityId = identitySelectors.id(state)
  const channel = importedChannelSelectors.data(state).toJS()
  const lastblock = nodeSelectors.latestBlock(getState())
  const fetchTreshold = lastblock - 2000
  try {
    if (channel.keys.sk) {
      await getClient().keys.importSK({
        sk: channel.keys.sk,
        rescan: 'yes',
        startHeight: fetchTreshold
      })
    } else {
      await getClient().keys.importIVK({
        ivk: channel.keys.ivk,
        rescan: 'yes',
        startHeight: fetchTreshold
      })
    }
    await dispatch(channelsHandlers.actions.loadChannels(identityId))
    dispatch(
      notificationsHandlers.actions.enqueueSnackbar({
        message: `Successfully imported channel ${channel.name}`,
        options: {
          variant: 'success'
        }
      })
    )
    dispatch(
      logsHandlers.epics.saveLogs({
        type: 'APPLICATION_LOGS',
        payload: `Successfully imported channel ${channel.name}`
      })
    )
    dispatch(modalsHandlers.actionCreators.closeModal('importChannelModal')())
    const channelsData = channelsSelectors.data(getState())
    const id = channelsData
      .find(ch => ch.get('address') === channel.address)
      .get('id')
    history.push(`/main/channel/${id}`)
    dispatch(clear())
  } catch (err) {
    dispatch(
      notificationsHandlers.actions.enqueueSnackbar({
        message: err.message,
        options: {
          variant: 'error'
        }
      })
    )
  }
}

const decodeChannelEpic = uri => async (dispatch, getState) => {
  dispatch(setDecoding(true))
  try {
    const channel = await uriToChannel(uri)
    const allChannels = channelsSelectors.data(getState())
    const checkImported = allChannels.find(
      ch => ch.get('keys').get('ivk') === channel.keys.ivk
    )
    if (checkImported) {
      dispatch(
        notificationsHandlers.actions.enqueueSnackbar(
          errorNotification({ message: `You already imported this channel` })
        )
      )
      dispatch(
        logsHandlers.epics.saveLogs({
          type: 'APPLICATION_LOGS',
          payload: `Channel already imported ${channel.address}`
        })
      )
      history.push(`/main/channel/${checkImported.get('id')}`)
    } else {
      const imported = await getClient().keys.importIVK({
        ivk: channel.keys.ivk,
        rescan: 'no',
        startHeight: 0
      })
      dispatch(setData({ ...channel, address: imported.address }))
      const openModal = modalsHandlers.actionCreators.openModal(
        'importChannelModal'
      )
      dispatch(openModal())
    }
  } catch (err) {
    console.log('Error while decoding channel')
    dispatch(setDecodingError(err))
    dispatch(
      notificationsHandlers.actions.enqueueSnackbar(
        errorNotification({ message: `Invalid channel URI: ${err.message}` })
      )
    )
    dispatch(
      logsHandlers.epics.saveLogs({
        type: 'APPLICATION_LOGS',
        payload: `Invalid channel URI`
      })
    )
  }
  dispatch(setDecoding(false))
}

const epics = {
  importChannel,
  removeChannel,
  decodeChannel: decodeChannelEpic
}

const reducer = handleActions(
  {
    [actionTypes.SET_DECODED_CHANNEL]: (state, { payload: channel }) =>
      state.set('data', Immutable.fromJS(channel)),
    [actionTypes.SET_DECODING_CHANNEL]: (state, { payload: decoding }) =>
      state.set('decoding', decoding),
    [actionTypes.SET_DECODING_ERROR]: (state, { payload: error }) =>
      state.set('errors', error),
    [clear]: () => ImportedChannelState()
  },
  initialState
)

export default {
  actions,
  epics,
  reducer
}
