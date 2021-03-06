import { createSelector } from 'reselect'
import identitySelectors from './identity'
import usersSelectors from './users'
import messagesQueueSelectors from './messagesQueue'
import operationsSelectors from './operations'
import messagesSelectors from './messages'
import zbayMessages from '../../zbay/messages'
import contacts from './contacts'
import { operationTypes } from '../handlers/operations'
import Immutable from 'immutable'
import { networkFee, messageType } from '../../../shared/static'

const store = s => s

export const channel = createSelector(store, state => {
  return state.get('channel')
})
export const channelInfo = createSelector(store, state =>
  state.get('channel').delete('message')
) // TODO refactor

export const spentFilterValue = createSelector(channel, c =>
  c.get('spentFilterValue', -1)
)

export const message = createSelector(
  channel,
  c => c.getIn(['message', c.get('id')]) || ''
)
export const id = createSelector(channel, c => c.get('id'))
const data = createSelector(contacts.contacts, id, (channels, id) =>
  channels.get(id)
)
export const isSizeCheckingInProgress = createSelector(channel, c =>
  c.get('isSizeCheckingInProgress')
)
export const messageSizeStatus = createSelector(channel, c =>
  c.get('messageSizeStatus')
)
export const displayableMessageLimit = createSelector(channel, c =>
  c.get('displayableMessageLimit')
)
export const isOwner = createSelector(
  id,
  contacts.contacts,
  identitySelectors.signerPubKey,
  (id, con, myKey) => {
    const contact = con.get(id)
    if (!contact) {
      return false
    }
    const settingsMsg = contact.messages.find(
      msg => msg.type === messageType.CHANNEL_SETTINGS
    )
    if (settingsMsg && settingsMsg.message.owner === myKey) {
      return true
    }
    return false
  }
)
export const channelSettingsMessage = createSelector(
  data,
  identitySelectors.signerPubKey,
  (data, signerPubKey) => {
    if (!data) {
      return null
    }
    const settingsMsg = data.messages.filter(
      msg =>
        msg.type === messageType.CHANNEL_SETTINGS ||
        msg.type === messageType.CHANNEL_SETTINGS_UPDATE
    )
    if (!settingsMsg.size) {
      return null
    }
    return settingsMsg.reduce((prev, curr) =>
      prev.createdAt > curr.createdAt ? prev : curr
    )
  }
)
export const advertFee = createSelector(channelSettingsMessage, settingsMsg => {
  if (settingsMsg === null) {
    return 0
  }
  return settingsMsg.message.minFee || settingsMsg.message.updateMinFee
})
export const channelDesription = createSelector(
  channelSettingsMessage,
  settingsMsg => {
    if (settingsMsg === null) {
      return 0
    }
    return settingsMsg.message.updateChannelDescription || ''
  }
)
export const onlyRegistered = createSelector(
  channelSettingsMessage,
  settingsMsg => {
    if (settingsMsg === null) {
      return 0
    }
    return settingsMsg.message.updateOnlyRegistered || '0'
  }
)
export const unread = createSelector(data, data =>
  data ? data.get('unread') : 0
)

export const pendingMessages = createSelector(
  operationsSelectors.operations,
  channel,
  (operations, channel) =>
    operations.filter(
      o =>
        o.type === operationTypes.pendingMessage &&
        o.meta.channelId === channel.id
    )
)

export const queuedMessages = createSelector(
  messagesQueueSelectors.queue,
  channel,
  (queue, channel) => queue.filter(m => m.channelId === channel.id)
)

export const currentChannelMessages = createSelector(
  channel,
  store,
  (ch, store) => messagesSelectors.currentChannelMessages(ch.id)(store)
)

export const channelOwner = createSelector(channel, store, (ch, store) =>
  messagesSelectors.channelOwner(ch.id)(store)
)

export const channelModerators = createSelector(channel, store, (ch, store) =>
  messagesSelectors.channelModerators(ch.id)(store)
)

export const channelBlockedUsers = createSelector(channel, store, (ch, store) =>
  messagesSelectors.channelBlockedUsers(ch.id)(store)
)

export const getFilteredContext = createSelector(channel, store, (ch, store) =>
  messagesSelectors.getFilteredContexed(ch.id)(store)
)

export const getChannelFilteredMessages = createSelector(
  channel,
  store,
  (ch, store) => messagesSelectors.getChannelFilteredMessages(ch.id)(store)
)

export const loader = createSelector(channel, meta => meta.loader)

const checkMessageTargetTimeWindow = ({
  targetCreatedAt,
  timeStamp,
  timeWindow
}) => {
  const inRange = ({ timeStamp, targetCreatedAt, timeWindow }) => {
    return (timeStamp - targetCreatedAt) * (timeStamp - timeWindow) <= 0
  }
  return inRange({ timeStamp, targetCreatedAt, timeWindow })
}

const concatMessages = (mainMsg, messagesToConcat) => {
  if (messagesToConcat.size === 1) {
    return mainMsg
  } else {
    const messagesArray = messagesToConcat.map(msg => msg.message)
    const lastMessageStatus = messagesToConcat.getIn([
      messagesToConcat.size - 1,
      'status'
    ])
    const concatedMessages = messagesArray.join('\n')
    const mergedMessage = mainMsg
      .set('message', concatedMessages)
      .set('status', lastMessageStatus)
    return mergedMessage
  }
}

export const mergeIntoOne = messages => {
  if (messages.size === 0) return
  let result = [[]]
  let last = null
  for (const msg of messages) {
    const isMessageInTargetZone = last
      ? checkMessageTargetTimeWindow({
        targetCreatedAt: last.createdAt,
        timeStamp: msg.createdAt,
        timeWindow: last.createdAt + 300
      })
      : true
    if (last && msg.status === 'failed') {
      result.push([])
      result[result.length - 1].push(msg)
    } else if (last && (msg.type !== 1 || last.type !== 1)) {
      result.push([])
      result[result.length - 1].push(msg)
    } else if (
      (last && last.sender.replyTo !== msg.sender.replyTo) ||
      !isMessageInTargetZone
    ) {
      result.push([])
      result[result.length - 1].push(msg)
    } else {
      result[result.length - 1].push(msg)
    }
    last = msg
  }
  const list = Immutable.fromJS(result)
  const concatedMessages = list.map(array => {
    return concatMessages(array.get(0), array)
  })
  return concatedMessages
}

export const messages = signerPubKey =>
  createSelector(
    identitySelectors.data,
    usersSelectors.registeredUser(signerPubKey),
    getChannelFilteredMessages,
    pendingMessages,
    queuedMessages,
    (
      identity,
      registeredUser,
      receivedMessages,
      pendingMessages,
      queuedMessages
    ) => {
      const userData = registeredUser ? registeredUser.toJS() : null
      const identityAddress = identity.address
      const identityName = userData ? userData.nickname : identity.name
      const displayableBroadcasted = receivedMessages.map(message => {
        return zbayMessages.receivedToDisplayableMessage({
          message,
          identityAddress
        })
      })

      const displayablePending = pendingMessages.map(operation => {
        return zbayMessages.operationToDisplayableMessage({
          operation,
          identityAddress,
          identityName
        })
      })

      const displayableQueued = queuedMessages.map(
        (queuedMessage, messageKey) =>
          zbayMessages.queuedToDisplayableMessage({
            queuedMessage,
            messageKey,
            identityAddress,
            identityName
          })
      )
      let concatedMessages = displayableBroadcasted
        .concat(displayablePending.values(), displayableQueued.values())
        .sortBy(m => m.get('createdAt'))
      if (concatedMessages.size > 0) {
        const merged = mergeIntoOne(concatedMessages)
        concatedMessages = Immutable.fromJS(merged)
      }
      return concatedMessages
    }
  )

export const shareableUri = createSelector(channel, c => c.shareableUri)

export const inputLocked = createSelector(
  identitySelectors.balance('zec'),
  identitySelectors.lockedBalance('zec'),
  (available, locked) => {
    if (available.gt(networkFee)) {
      return INPUT_STATE.AVAILABLE
    } else {
      if (locked.gt(0)) {
        return INPUT_STATE.LOCKED
      }
    }
    return INPUT_STATE.DISABLE
  }
)

export const INPUT_STATE = {
  DISABLE: 0,
  AVAILABLE: 1,
  LOCKED: 2,
  UNREGISTERED: 3
}

export const channelId = createSelector(channel, ch => ch.id)

export const members = createSelector(messages(), msgs =>
  msgs.reduce((acc, msg) => {
    return acc.add(msg.sender.replyTo)
  }, new Set())
)

export const channelParticipiants = createSelector(
  contacts.contacts,
  id,
  (c, i) => {
    const contact = c.get(i)
    if (!contact) {
      return new Set()
    }
    const messages = contact.messages
    const members = messages.reduce((acc, msg) => {
      return acc.add(msg.sender.replyTo)
    }, new Set())
    return members
  }
)

export default {
  data,
  inputLocked,
  loader,
  channel,
  spentFilterValue,
  message,
  pendingMessages,
  shareableUri,
  channelId,
  channelOwner,
  channelModerators,
  channelBlockedUsers,
  getChannelFilteredMessages,
  getFilteredContext,
  messages,
  channelInfo,
  advertFee,
  onlyRegistered,
  members,
  channelParticipiants,
  unread,
  messageSizeStatus,
  isSizeCheckingInProgress,
  id,
  isOwner,
  channelDesription,
  displayableMessageLimit
}
