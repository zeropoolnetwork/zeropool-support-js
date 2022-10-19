import { Transaction } from '../transaction'

const k = 'MCTF6EHW28WGXZN21USVHDIAVFN9WC2IH7'
const mockedTransactions = []
const fixTimestamp = (timestamp: string | number) =>
  (timestamp + '').length < 13
    ? +timestamp * 1000
    : +timestamp

const getUrl = (address: string) =>
  'https://api-goerli.etherscan.io/api' +
   '?module=account' +
   '&action=txlist' +
   '&address=' + address +
   '&startblock=0' +
   '&endblock=99999999' +
   '&page=1' +
   '&offset=10' +
   '&sort=asc' +
   '&apikey=YourApiKeyToken' // + k

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

export const fetchTransactions = (address: string, mocked = false): Promise<Transaction[]> =>
  mocked
    ? Promise.resolve(mockedTransactions)
    : fetch(getUrl(address)).then((val) =>
        val
          .clone()
          .json()
          .then((response) => response.result)
          .then((data) => data.map(toTransaction)),
      )
