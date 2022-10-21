import { Transaction } from '../transaction';

const fixTimestamp = (timestamp: string | number) =>
  (timestamp + '').length < 13 ? +timestamp * 1000 : +timestamp;

const getUrl = (address: string, key: string) =>
  'https://api-goerli.etherscan.io/api' +
  '?module=account' +
  '&action=txlist' +
  '&address=' +
  address +
  '&startblock=0' +
  '&endblock=99999999' +
  '&page=1' +
  '&offset=10' +
  '&sort=asc' +
  '&apikey=' +
  key;

export const fetchTransactions = (
  address: string,
  key = 'YourApiKeyToken'
): Promise<any[]> =>
  fetch(getUrl(address, key)).then((val) =>
    val
      .clone()
      .json()
      .then((response) => response.result)
      .then((data) => data.filter((tr) => !tr.functionName.includes('approve')))
  );
