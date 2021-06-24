const { decodeAddress, encodeAddress } = require('@polkadot/keyring');
const { hexToU8a, isHex } = require('@polkadot/util');

const isValidAddress = (address, chain) => {
  try {
    encodeAddress(
      isHex(address)
        ? hexToU8a(address)
        : decodeAddress(address)
    );

    if (chain === 'Kusama' && isKusamaAddress(address)) {
      return true;
    }

    if (chain === 'Polkadot' && isPolkadotAddress(address)) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

const isKusamaAddress = (address) => {
  if (address.length === 47 && address.match(/[C-Z].+/)?.index === 0) {
    return true;
  } else {
    return false;
  }
}

const isPolkadotAddress = (address) => {
  if ((address.length === 48 || address.length === 47) && address.match(/1+/)?.index === 0) {
    return true;
  } else {
    console.log(`false`);
    return false;
  }
}

module.exports = {
  isValidAddress
}