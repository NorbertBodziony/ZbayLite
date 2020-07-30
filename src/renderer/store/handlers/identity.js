import Immutable from 'immutable'
import BigNumber from 'bignumber.js'
import { createAction, handleActions } from 'redux-actions'
import secp256k1 from 'secp256k1'
import { randomBytes } from 'crypto'
import { ipcRenderer } from 'electron'
import { DateTime } from 'luxon'

import client from '../../zcash'
import channels from '../../zcash/channels'

import identitySelectors from '../selectors/identity'
// import nodeSelectors from '../selectors/node'
import txnTimestampsSelector from '../selectors/txnTimestamps'
// import channelsSelectors from '../selectors/channels'
// import channelsHandlers from './channels'
// import removedChannelsHandlers from './removedChannels'
// import usersHandlers from './users'
// import contactsHandlers from './contacts'
// import messagesHandlers from './messages'
// import publicChannelsHandlers from './publicChannels'
import coordinatorHandlers from './coordinator'
// import offersHandlers from './offers'
import whitelistHandlers from './whitelist'
import txnTimestampsHandlers from './txnTimestamps'
import logsHandlers from '../../store/handlers/logs'
// import vaultHandlers from './vault'
import ratesHandlers from './rates'
import nodeHandlers from './node'
import notificationCenterHandlers from './notificationCenter'
import vault, { getVault } from '../../vault'
// import migrateTo_0_2_0 from '../../../shared/migrations/0_2_0' // eslint-disable-line camelcase
// import migrateTo_0_7_0 from '../../../shared/migrations/0_7_0' // eslint-disable-line camelcase
import { LoaderState, successNotification } from './utils'
import modalsHandlers from './modals'
import notificationsHandlers from './notifications'
import {
  actionTypes,
  networkFeeSatoshi,
  satoshiMultiplier
} from '../../../shared/static'
import electronStore from '../../../shared/electronStore'
import { formSchema as shippingDataSchema } from '../../components/widgets/settings/ShippingSettingsForm'
// import channels from '../../zcash/channels'

export const ShippingData = Immutable.Record(
  {
    firstName: '',
    lastName: '',
    street: '',
    country: '',
    region: '',
    city: '',
    postalCode: ''
  },
  'ShippingData'
)

const Identity = Immutable.Record(
  {
    id: null,
    address: '',
    transparentAddress: '',
    signerPrivKey: '',
    signerPubKey: '',
    name: '',
    shippingData: ShippingData(),
    balance: null,
    lockedBalance: null,
    donationAllow: true,
    shieldingTax: true,
    donationAddress: '',
    freeUtxos: 0,
    addresses: Immutable.List(),
    shieldedAddresses: Immutable.List()
  },
  'Identity'
)

// export const Identity = values => {
//   const record = _Identity(values)
//   return record.set('shippingData', ShippingData(record.shippingData))
// }

export const IdentityState = Immutable.Record(
  {
    data: Identity(),
    fetchingBalance: false,
    loader: LoaderState({ loading: false }),
    errors: ''
  },
  'IdentityState'
)

export const initialState = IdentityState()

export const setIdentity = createAction(actionTypes.SET_IDENTITY)
export const setBalance = createAction(actionTypes.SET_IDENTITY_BALANCE)
export const setLockedBalance = createAction(
  actionTypes.SET_IDENTITY_LOCKED_BALANCE
)
export const setErrors = createAction(actionTypes.SET_IDENTITY_ERROR)
export const setFetchingBalance = createAction(actionTypes.SET_FETCHING_BALANCE)
export const setLoading = createAction(actionTypes.SET_IDENTITY_LOADING)
export const setLoadingMessage = createAction(
  actionTypes.SET_IDENTITY_LOADING_MESSAGE
)
export const setShippingData = createAction(
  actionTypes.SET_IDENTITY_SHIPPING_DATA
)
export const setDonationAllow = createAction(actionTypes.SET_DONATION_ALLOW)
export const setDonationAddress = createAction(actionTypes.SET_DONATION_ADDRESS)
export const setShieldingTax = createAction(actionTypes.SET_SHIELDING_TAX)
export const setFreeUtxos = createAction(actionTypes.SET_FREE_UTXOS)
export const setUserAddreses = createAction(actionTypes.SET_USER_ADDRESSES)
export const setUserShieldedAddreses = createAction(
  actionTypes.SET_USER_SHIELDED_ADDRESES
)

const actions = {
  setIdentity,
  setFetchingBalance,
  setErrors,
  setLoading,
  setLoadingMessage,
  setLockedBalance,
  setShippingData,
  setBalance,
  setDonationAllow,
  setDonationAddress,
  setShieldingTax,
  setFreeUtxos
}
export const fetchAffiliateMoney = () => async (dispatch, getState) => {
  try {
    const identityAddress = identitySelectors.address(getState())
    const transfers = await client().payment.received(identityAddress)
    const identityId = identitySelectors.id(getState())
    const affiliatesTransfers = transfers.filter(msg =>
      msg.memo.startsWith('aa')
    )
    let amount = 0
    let txnTimestamps = txnTimestampsSelector.tnxTimestamps(getState())
    for (const key in affiliatesTransfers) {
      const transfer = transfers[key]
      if (!txnTimestamps.get(transfer.txid)) {
        amount += transfer.amount
        const result = await client().confirmations.getResult(transfer.txid)
        await getVault().transactionsTimestamps.addTransaction(
          transfer.txid,
          result.timereceived
        )
        await dispatch(
          txnTimestampsHandlers.actions.addTxnTimestamp({
            tnxs: { [transfer.txid]: result.timereceived.toString() }
          })
        )
      }
    }
    if (amount) {
      dispatch(
        notificationsHandlers.actions.enqueueSnackbar(
          successNotification({
            message: `You received ${amount} ZEC from your affiliates`
          })
        )
      )
    }
    vault.identity.updateLastLogin(identityId)
  } catch (err) {}
}
export const fetchBalance = () => async (dispatch, getState) => {
  try {
    dispatch(setFetchingBalance(true))
    const balanceObj = await client.balance()
    dispatch(
      setLockedBalance(
        new BigNumber(
          (balanceObj.zbalance - balanceObj.verified_zbalance) /
            satoshiMultiplier
        )
      )
    )
    dispatch(
      setBalance(
        new BigNumber(balanceObj.verified_zbalance / satoshiMultiplier)
      )
    )
    dispatch(
      logsHandlers.epics.saveLogs({
        type: 'APPLICATION_LOGS',
        payload: `Fetching balance: locked balance: ${(balanceObj.zbalance -
          balanceObj.verified_zbalance) /
          satoshiMultiplier}, balance: ${balanceObj.verified_zbalance /
          satoshiMultiplier}`
      })
    )
  } catch (err) {
    dispatch(setErrors(err.message))
  } finally {
    dispatch(setFetchingBalance(false))
  }
}
export const fetchFreeUtxos = () => async (dispatch, getState) => {
  try {
    const utxos = await client.notes()
    const freeUtxos = utxos.unspent_notes.filter(
      utxo => utxo.value > networkFeeSatoshi
    )
    dispatch(setFreeUtxos(freeUtxos.length))
    dispatch(
      logsHandlers.epics.saveLogs({
        type: 'APPLICATION_LOGS',
        payload: `Setting free UTXOs: ${freeUtxos.length}`
      })
    )
  } catch (err) {
    console.warn(err)
  }
}

export const createSignerKeys = () => {
  let signerPrivKey
  do {
    signerPrivKey = randomBytes(32)
  } while (!secp256k1.privateKeyVerify(signerPrivKey))
  return {
    signerPrivKey: signerPrivKey.toString('hex'),
    signerPubKey: secp256k1.publicKeyCreate(signerPrivKey, true).toString('hex')
  }
}

export const createIdentity = ({ name }) => async (dispatch, getState) => {
  try {
    const accountAddresses = await client.addresses()
    const { z_addresses: zAddresses } = accountAddresses
    const { t_addresses: tAddresses } = accountAddresses
    const [zAddress] = zAddresses
    const [tAddress] = tAddresses
    const tpk = await client.getPrivKey(tAddress)
    const sk = await client.getPrivKey(zAddress)

    const { signerPrivKey, signerPubKey } = exportFunctions.createSignerKeys()

    electronStore.set('identity', {
      name,
      address: zAddress,
      transparentAddress: tAddress,
      signerPubKey,
      signerPrivKey,
      keys: {
        tpk,
        sk
      }
    })
    const network = 'mainnet'

    const channelsToImport = ['general', 'registeredUsers', 'channelOfChannels', 'store']
    const channelsWithDetails = channelsToImport.reduce((o, key) => {
      const channelDetails = channels[key][network]
      const preparedChannel = {
        name: channelDetails.name,
        private: channelDetails.private,
        address: channelDetails.address,
        unread: channelDetails.unread,
        description: channelDetails.description,
        keys: channelDetails.keys,
        lastSeen: DateTime.utc().toSeconds()
      }
      return { ...o, [preparedChannel.address]: preparedChannel }
    }, {})
    electronStore.set('defaultChannels', channelsWithDetails)
    dispatch(
      logsHandlers.epics.saveLogs({
        type: 'APPLICATION_LOGS',
        payload: `Creating identity / importing default channels`
      })
    )
    const channelsToLoad = Object.keys(channelsWithDetails)
    for (const channel of channelsToLoad) {
      await client.importKey(
        channelsWithDetails[channel]['keys']['ivk'],
        740000)
    }
    await client.rescan()
    return electronStore.get('identity')
  } catch (err) {
    console.log('error', err)
  }
}

export const loadIdentity = () => async (dispatch, getState) => {
  const identity = electronStore.get('identity')
  if (identity) {
    await dispatch(setIdentity(identity))
    dispatch(
      logsHandlers.epics.saveLogs({
        type: 'APPLICATION_LOGS',
        payload: `Loading identity`
      })
    )
  }
}

export const createWalletBackup = () => async (dispatch, getState) => {
  const isDev = process.env.NODE_ENV === 'development'
  const isWalletCopyCreated = electronStore.get('isWalletCopyCreated')
  if (!isWalletCopyCreated && !isDev) {
    ipcRenderer.send('make-wallet-backup')
  }
}

export const setIdentityEpic = (identityToSet, isNewUser) => async (
  dispatch,
  getState
) => {
  // let identity = await migrateTo_0_2_0.ensureIdentityHasKeys(identityToSet)
  let identity = identityToSet
  dispatch(setLoading(true))
  dispatch(
    logsHandlers.epics.saveLogs({
      type: 'APPLICATION_LOGS',
      payload: `Start loading identity`
    })
  )
  // const isRescanned = electronStore.get('AppStatus.blockchain.isRescanned')
  const isNewUser = electronStore.get('isNewUser')
  try {
    dispatch(setLoadingMessage('Ensuring identity integrity'))
    // Make sure identity is handled by the node
    await dispatch(setLoadingMessage('Ensuring node contains identity keys'))
    // const network = nodeSelectors.network(getState())
    await dispatch(whitelistHandlers.epics.initWhitelist())
    await dispatch(notificationCenterHandlers.epics.init())
    dispatch(setLoadingMessage('Setting identity'))
    // Check if identity has signerKeys
    // if (!identity.signerPrivKey || !identity.signerPubKey) {
    //   const { signerPrivKey, signerPubKey } = createSignerKeys()
    //   const { value: updatedIdentity } = await dispatch(
    //     vaultHandlers.actions.updateIdentitySignerKeys({
    //       id: identity.id,
    //       signerPubKey,
    //       signerPrivKey
    //     })
    //   )
    //   identity = updatedIdentity
    // }
    await dispatch(setIdentity(identity))
    const shippingAddress = electronStore.get('identity.shippingData')
    if (shippingAddress) {
      dispatch(setShippingData(ShippingData(shippingAddress)))
    }
    // await dispatch(txnTimestampsHandlers.epics.getTnxTimestamps())
    // dispatch(removedChannelsHandlers.epics.getRemovedChannelsTimestamp())

    dispatch(setLoadingMessage('Fetching balance and loading channels'))
    // await dispatch(fetchBalance())
    await dispatch(initAddreses())
    dispatch(ratesHandlers.epics.setInitialPrice())

    await dispatch(nodeHandlers.epics.getStatus())
    await dispatch(fetchFreeUtxos())
    await dispatch(coordinatorHandlers.epics.coordinator())
    // console.log(await client.addresses())
    // const response = await client.importKey(
    //   channels.general.mainnet.keys.ivk,
    //   800000
    // )
    // console.log(response)
    // console.log(await client.addresses())
    // console.log(await client.rescan())
    dispatch(setLoadingMessage('Loading users and messages'))
    // await dispatch(usersHandlers.epics.fetchUsers())
    // await dispatch(contactsHandlers.epics.loadAllSentMessages())
    // await dispatch(offersHandlers.epics.loadVaultContacts())
    // await dispatch(offersHandlers.epics.initMessage())
    // await dispatch(publicChannelsHandlers.epics.fetchPublicChannels())
    // await dispatch(channelsHandlers.epics.withdrawMoneyFromChannels())
    // await dispatch(
    //   messagesHandlers.epics.fetchMessages(
    //     channelsSelectors
    //       .data(getState())
    //       .find(
    //         channel =>
    //           channel.get('address') === channels.general[network].address
    //       )
    //   )
    // )
  } catch (err) {}
  const zecBalance = identitySelectors.balance('zec')(getState())
  if (isNewUser === true && zecBalance.gt(0)) {
    dispatch(modalsHandlers.actionCreators.openModal('createUsernameModal')())
  }
  // dispatch(fetchAffiliateMoney())
  dispatch(setLoading(false))
  dispatch(
    logsHandlers.epics.saveLogs({
      type: 'APPLICATION_LOGS',
      payload: ` Loading identity finished`
    })
  )
  // Don't show deposit modal if we use faucet 12.02.2020
  // const balance = identitySelectors.balance('zec')(getState())
  // const lockedBalance = identitySelectors.lockedBalance('zec')(getState())
  // if (lockedBalance.plus(balance).lt(0.0001) && newUser === false) {
  //   setTimeout(
  //     () => dispatch(modalsHandlers.actionCreators.openModal('depositMoney')()),
  //     500
  //   )
  // }
}

export const updateShippingData = (values, formActions) => async (
  dispatch,
  getState
) => {
  console.log('working 123 123 123', values)
  await shippingDataSchema.validate(values)
  electronStore.set('identity.shippingData', values)
  await dispatch(setShippingData(ShippingData(values)))
  dispatch(
    notificationsHandlers.actions.enqueueSnackbar(
      successNotification({ message: 'Shipping Address Updated' })
    )
  )
  dispatch(
    logsHandlers.epics.saveLogs({
      type: 'APPLICATION_LOGS',
      payload: `Updating shipping data`
    })
  )
  formActions.setSubmitting(false)
}

export const updateDonation = allow => async (dispatch, getState) => {
  const id = identitySelectors.id(getState())
  const identity = await vault.identity.updateDonation(id, allow)
  await dispatch(setDonationAllow(identity.donationAllow))
  dispatch(
    notificationsHandlers.actions.enqueueSnackbar(
      successNotification({ message: 'Donation information updated' })
    )
  )
  dispatch(
    logsHandlers.epics.saveLogs({
      type: 'APPLICATION_LOGS',
      payload: `Updating donation status`
    })
  )
}

export const updateDonationAddress = address => async (dispatch, getState) => {
  const id = identitySelectors.id(getState())
  await vault.identity.updateDonationAddress(id, address)
}
export const updateShieldingTax = allow => async (dispatch, getState) => {
  const id = identitySelectors.id(getState())
  const identity = await vault.identity.updateShieldingTax(id, allow)
  await dispatch(setShieldingTax(identity.shieldingTax))
}
export const generateNewAddress = () => async (dispatch, getState) => {
  if (!electronStore.get('addresses')) {
    electronStore.set('addresses', JSON.stringify([]))
  }
  const addresses = JSON.parse(electronStore.get('addresses'))
  const address = await client().addresses.createTransparent()
  addresses.unshift(address)
  dispatch(setUserAddreses(Immutable.List(addresses)))
  electronStore.set('addresses', JSON.stringify(addresses))
}
export const generateNewShieldedAddress = () => async (dispatch, getState) => {
  if (!electronStore.get('shieldedAddresses')) {
    electronStore.set('shieldedAddresses', JSON.stringify([]))
  }
  const addresses = JSON.parse(electronStore.get('shieldedAddresses'))
  const address = await client().addresses.create('sapling')
  addresses.unshift(address)
  dispatch(setUserShieldedAddreses(Immutable.List(addresses)))
  electronStore.set('shieldedAddresses', JSON.stringify(addresses))
}
export const initAddreses = () => async (dispatch, getState) => {
  if (!electronStore.get('addresses')) {
    electronStore.set('addresses', JSON.stringify([]))
  }
  if (!electronStore.get('shieldedAddresses')) {
    electronStore.set('shieldedAddresses', JSON.stringify([]))
  }
  const addresses = JSON.parse(electronStore.get('addresses'))
  dispatch(setUserAddreses(Immutable.List(addresses)))
  const shieldedAddreses = JSON.parse(electronStore.get('shieldedAddresses'))
  dispatch(setUserShieldedAddreses(Immutable.List(shieldedAddreses)))
}
const epics = {
  fetchBalance,
  createIdentity,
  setIdentity: setIdentityEpic,
  updateShippingData,
  createSignerKeys,
  updateDonation,
  updateDonationAddress,
  updateShieldingTax,
  fetchFreeUtxos,
  loadIdentity,
  generateNewAddress,
  generateNewShieldedAddress
}

const exportFunctions = {
  createSignerKeys
}

export const reducer = handleActions(
  {
    [setLoading]: (state, { payload: loading }) =>
      state.setIn(['loader', 'loading'], loading),
    [setLoadingMessage]: (state, { payload: message }) =>
      state.setIn(['loader', 'message'], message),
    [setIdentity]: (state, { payload: identity }) =>
      state.update('data', data => data.merge(identity)),
    [setBalance]: (state, { payload: balance }) =>
      state.update('data', data => data.set('balance', balance)),
    [setLockedBalance]: (state, { payload: balance }) =>
      state.update('data', data => data.set('lockedBalance', balance)),
    [setFetchingBalance]: (state, { payload: fetching }) =>
      state.set('fetchingBalance', fetching),
    [setErrors]: (state, { payload: errors }) => state.set('errors', errors),
    [setShippingData]: (state, { payload: shippingData }) =>
      state.setIn(['data', 'shippingData'], ShippingData(shippingData)),
    [setDonationAllow]: (state, { payload: allow }) =>
      state.setIn(['data', 'donationAllow'], allow),
    [setDonationAddress]: (state, { payload: address }) =>
      state.setIn(['data', 'donationAddress'], address),
    [setShieldingTax]: (state, { payload: allow }) =>
      state.setIn(['data', 'shieldingTax'], allow),
    [setFreeUtxos]: (state, { payload: freeUtxos }) =>
      state.setIn(['data', 'freeUtxos'], freeUtxos),
    [setUserAddreses]: (state, { payload: addresses }) =>
      state.setIn(['data', 'addresses'], addresses),
    [setUserShieldedAddreses]: (state, { payload: shieldedAddresses }) =>
      state.setIn(['data', 'shieldedAddresses'], shieldedAddresses)
  },
  initialState
)

export default {
  actions,
  epics,
  reducer,
  exportFunctions
}
