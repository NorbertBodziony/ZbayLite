import React from 'react'
import PropTypes from 'prop-types'
import * as R from 'ramda'

import Grid from '@material-ui/core/Grid'
import { withStyles } from '@material-ui/core/styles'

import ChannelInput from '../../../containers/widgets/channels/ChannelInput'
import ChannelMessages from '../../../containers/widgets/channels/ChannelMessages'
import { withSpinnerLoader } from '../../ui/SpinnerLoader'

const styles = {
  fullHeight: {
    minHeight: '100%',
    position: 'relative'
  }
}

// TODO: filter by spent
export const ChannelContent = ({ classes, channelId, inputState, contactId }) => (
  <Grid
    container
    direction='column'
    justify='center'
    className={classes.fullHeight}
  >
    <ChannelMessages channelId={channelId} contactId={contactId} />
    <ChannelInput inputState={inputState} contactId={contactId} />
  </Grid>
)

ChannelContent.propTypes = {
  classes: PropTypes.object.isRequired,
  channelId: PropTypes.string,
  contactId: PropTypes.string,
  inputState: PropTypes.number
}

ChannelContent.defaultProps = {
  inputState: 1
}

export default R.compose(
  withSpinnerLoader,
  withStyles(styles)
)(ChannelContent)
