import { connect } from 'react-redux'
import * as R from 'ramda'

import { withModal } from '../../../store/handlers/modals'
import ChannelInfoModal from '../../../components/widgets/channels/ChannelInfoModal'
import contactsSelectors from '../../../store/selectors/contacts'
import channelSelectors from '../../../store/selectors/channel'

export const mapStateToProps = state => ({
  channelData: contactsSelectors.directMessagesContact(channelSelectors.channel(state).get('address'))(state).toJS(),
  directMessage: true
})

export default R.compose(
  connect(mapStateToProps),
  withModal('channelInfo')
)(ChannelInfoModal)
