import { Transaction as NativeTx } from 'web3-core'

import { Transaction } from '../transaction'

const k = 'MCTF6EHW28WGXZN21USVHDIAVFN9WC2IH7'
const mockedTransactions = []
const fixTimestamp = (timestamp: string | number) =>
  (timestamp + '').length < 13
    ? +timestamp * 1000
    : +timestamp

const getUrl = (address: string) =>
  'https://api-kovan.etherscan.io/api?module=account&action=txlist&address=' +
  address +
  '&startblock=0&endblock=99999999&sort=asc&apikey=' +
  k

const toTransaction = (tr: any) =>
  ({
    jobId: tr.jobId,
    blockHash: tr.blockHash,
    status: tr.status,
    amount: tr.value,
    from: tr.from,
    to: tr.to,
    timestamp: fixTimestamp(tr.timeStamp),
    type: tr.type,
    hash: tr.hash,
  } as Transaction)

export const fetchTransactions = (address: string, mocked = false): Promise<NativeTx[]> =>
  mocked
    ? Promise.resolve(mockedTransactions)
    : fetch(getUrl(address), {mode: 'no-cors'}).then((val) =>
        val
          .clone()
          .json()
          .then((response) => response.result)
          .then((data) => data.map(toTransaction)),
      )
