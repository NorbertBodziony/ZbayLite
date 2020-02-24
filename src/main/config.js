const PARAMS_LINK = 'https://zbay-blockchain-and-params.zbay.app/params/params.json'
const BLOCKCHAIN_LINK = 'https://zbay-blockchain-and-params.zbay.app/v3/indexV3.json'

const PARAMS_STATUSES = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  FETCHING: 'FETCHING'
}

const BLOCKCHAIN_STATUSES = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  FETCHING: 'FETCHING',
  TO_FETCH: 'TO_FETCH'
}

const VAULT_STATUSES = {
  CREATED: 'CREATED'
}

const UPDATE_STATUSES = {
  NEW_UPDATE: 'NEW_UPDATE',
  CHECKING: 'CHECKING',
  UPDATE_DOWNLOADED: 'UPDATE_DOWNLOADED',
  UPDATE_PERFORMED: 'UPDATE_PERFORMED',
  PROCESSING_UPDATE: 'PROCESSING_UPDATE',
  NO_UPDATE: 'NO_UPDATE'
}

export default {
  PARAMS_LINK,
  BLOCKCHAIN_LINK,
  BLOCKCHAIN_STATUSES,
  PARAMS_STATUSES,
  VAULT_STATUSES,
  UPDATE_STATUSES
}
