/* eslint import/first: 0 */
import React from 'react'
import { shallow } from 'enzyme'
import BigNumber from 'bignumber.js'

import { SendMoneyModal } from './SendMoneyModal'
import { mockClasses } from '../../../../shared/testing/mocks'

describe('SendMoneyModal', () => {
  it('renders component step 1', () => {
    const result = shallow(
      <SendMoneyModal
        classes={mockClasses}
        step={1}
        setStep={() => {}}
        rateUsd={new BigNumber(50)}
        rateZec={new BigNumber(0.4)}
        balanceZec={new BigNumber(0.7)}
        userData={{ userData: { address: 'test', name: 'test' } }}
        open
        handleClose={() => {}}
      />
    )
    expect(result).toMatchSnapshot()
  })
  it('renders component step 2', () => {
    const result = shallow(
      <SendMoneyModal
        classes={mockClasses}
        step={2}
        setStep={() => {}}
        rateUsd={new BigNumber(50)}
        rateZec={new BigNumber(0.4)}
        balanceZec={new BigNumber(0.7)}
        userData={{ userData: { address: 'test', name: 'test' } }}
        open
        handleClose={() => {}}
      />
    )
    expect(result).toMatchSnapshot()
  })
  it('renders component step 3', () => {
    const result = shallow(
      <SendMoneyModal
        classes={mockClasses}
        step={3}
        setStep={() => {}}
        rateUsd={new BigNumber(50)}
        rateZec={new BigNumber(0.4)}
        balanceZec={new BigNumber(0.7)}
        userData={{ userData: { address: 'test', name: 'test' } }}
        open
        handleClose={() => {}}
      />
    )
    expect(result).toMatchSnapshot()
  })
  it('renders component step 4', () => {
    const result = shallow(
      <SendMoneyModal
        classes={mockClasses}
        step={4}
        setStep={() => {}}
        rateUsd={new BigNumber(50)}
        rateZec={new BigNumber(0.4)}
        balanceZec={new BigNumber(0.7)}
        userData={{ userData: { address: 'test', name: 'test' } }}
        open
        handleClose={() => {}}
      />
    )
    expect(result).toMatchSnapshot()
  })
})
