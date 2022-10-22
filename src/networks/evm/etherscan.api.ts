export const delay = (t) => new Promise((res) => setTimeout(res, t));

const getFundUrl = (address: string, key: string) =>
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

const getTokenUrl = (address: string, tokenAddress: string, key: string) =>
  'https://api-goerli.etherscan.io/api' +
  '?module=account' +
  '&action=tokentx' +
  '&address=' +
  address +
  '&contractaddress=' +
  tokenAddress +
  '&startblock=0' +
  '&endblock=99999999' +
  '&page=1' +
  '&offset=10' +
  '&sort=asc' +
  '&apikey=' +
  key;

export const fetchFundTransactions = (
  address: string,
  key = 'YourApiKeyToken'
): Promise<any[]> =>
  fetch(getFundUrl(address, key)).then((data) =>
    data
      .clone()
      .json()
      .then((response) => response.result)
      .then((data) => data.filter((tr) => !tr.functionName.includes('approve')))
      .then((data) => data.filter((tr) => !tr.functionName.includes('mint')))
  );

export const fetchTokenTransactions = (
  address: string,
  tokenAddress: string,
  key = 'YourApiKeyToken'
): Promise<any[]> =>
  fetch(getTokenUrl(address, tokenAddress, key)).then((data) =>
    data
      .clone()
      .json()
      .then((response) => response.result)
  );
