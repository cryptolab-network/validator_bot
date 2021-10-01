const BN = require('bn.js');
const { BN_HUNDRED, BN_MAX_INTEGER, BN_ONE, BN_ZERO } = require('@polkadot/util');
const keys = require('./config/keys');

const POLKADOT_PARAMS = {
  auctionAdjust: 0,
  auctionMax: 0,
  falloff: 0.05,
  maxInflation: 0.1,
  minInflation: 0.025,
  stakeTarget: 0.75
}

const KUSAMA_PARAMS = {
  auctionAdjust: (0.3 / 60),
  auctionMax: 60,
  falloff: 0.05,
  maxInflation: 0.1,
  minInflation: 0.025,
  stakeTarget: 0.75
}

const CHAIN_PARAMS = {
  Kusama: KUSAMA_PARAMS,
  Polkadot: POLKADOT_PARAMS
}

const _calcInflation = async (chainData) => {
  const activeEra = await chainData.queryActiveEra();
  const totalStake = await chainData.queryErasTotalStake(activeEra);
  const totalIssuance = await chainData.queryTotalIssuance();

  const numAuctions = (keys.CHAIN === 'Kusama') ? 10 : 0;
  const BN_MILLION = new BN('1000000', 10);
  const BN_ZERO = new BN('0', 10);
  const { auctionAdjust, auctionMax, falloff, maxInflation, minInflation, stakeTarget } = CHAIN_PARAMS[keys.CHAIN];
  const stakedFraction = totalStake.isZero() || totalIssuance.isZero() ? 0 : totalStake.mul(BN_MILLION).div(totalIssuance).toNumber() / BN_MILLION.toNumber();
  const idealStake = stakeTarget - (Math.min(auctionMax, numAuctions)) * auctionAdjust;
  const idealInterest = maxInflation / idealStake;
  const inflation = 100 * (minInflation + (stakedFraction <= idealStake ? (stakedFraction * (idealInterest - (minInflation / idealStake))) : (((idealInterest * idealStake) - minInflation) * Math.pow(2, (idealStake - stakedFraction) / falloff))));
  const stakedReturned = stakedFraction ? (inflation / stakedFraction) : 0;
  return {
    inflation,
    stakedReturned
  };
}

const calcRank = async (chainData, validators) => {
  const inflation = await _calcInflation(chainData);

  const activeTotals = validators.filter(({ active }) => active).map(({ exposure }) => exposure.total.unwrap());
  const totalStaked = activeTotals.reduce((total, value) => total.iadd(value), new BN(0));
  let avgStaked = totalStaked.divn(activeTotals.length);

  let rankList = [];
  validators.forEach((v) => {
    if (v.active) {
      const bondTotal = v.exposure.total.unwrap();
      const adjusted = avgStaked.mul(BN_HUNDRED).imuln(inflation.stakedReturned).div(bondTotal);

      v.stakedReturn = (adjusted.gt(BN_MAX_INTEGER) ? BN_MAX_INTEGER : adjusted).toNumber() / BN_HUNDRED.toNumber();
      v.stakedReturnCmp = (v.stakedReturn * (100 - (v.validatorPrefs.commission.unwrap().toNumber() / 10000000)) / 100);
      // 1%
      v.stakedReturnCmpOne = (v.stakedReturn * (100 - 1) / 100);

      const bondOwn = v.exposure.own.unwrap();
      const bondOther = bondTotal.sub(bondOwn);

      const data = {
        stashId: v.stashId.toString(),
        activeNominators: v.exposure.others.length,
        commission: (v.validatorPrefs.commission.unwrap().toNumber() / 10000000),
        stakedReturn: v.stakedReturn,
        stakedReturnCmp: v.stakedReturnCmp,
        stakedReturnCmpOne: v.stakedReturnCmpOne,
        bondOther: bondOther,
        bondOwn: bondOwn,
        bondTotal: bondTotal,
      }
      rankList.push(data);
    }
  });

  rankList
  .sort((a, b) => b.bondOther.cmp(a.bondOther))
  .sort((a, b) => b.bondOwn.cmp(a.bondOwn))
  .sort((a, b) => b.bondTotal.cmp(a.bondTotal))
  .map((v, index) => {
    v.rankBondTotal = index + 1;
    return v;
  })
  .sort((a, b) => a.stakedReturnCmp - b.stakedReturnCmp)
  .map((v, index) => {
    v.rankReward = index + 1;
    return v;
  })
  .sort((a, b) => 
    (b.stakedReturnCmp - a.stakedReturnCmp) ||
    (a.commission - b.commission) ||
    (b.rankBondTotal - a.rankBondTotal)
  )
  .map((v, index) => {
    v.rank = index + 1;
    return v;
  })
  .sort((a, b) => a.rank - b.rank);

  // make sure the elements of rankList is sorted.
  rankList.sort((a, b) => a.rank - b.rank);

  return rankList;
}

const calcNewRank = (stashId, rankList) => {
  let rank;
  for (let i=0; i<rankList.length; i++) {
    if (rankList[i].stashId === stashId) {
      rank = rankList[i];
      break;
    }
  }
  
  // calculate new rank if commission set to 0%
  rank.newRank = 0;
  if (rank.commission === 0) {
    // same
    rank.newRank = rank.rank;
  } else {
    // search new rank
    for (let i=0; i<rankList.length; i++) {
      if (rank.stakedReturn >= rankList[i].stakedReturnCmp) {
        rank.newRank = rankList[i].rank;
        break;
      }
    }
  }
  // 1%
  rank.newRankOne = 0;
  if (rank.commission === 10000000) {
    rank.newRankOne = rank.rank;
  } else {
    // search new rank
    for (let i=0; i<rankList.length; i++) {
      if (rank.stakedReturnCmpOne >= rankList[i].stakedReturnCmp) {
        rank.newRankOne = rankList[i].rank;
        break;
      }
    }
  }

  console.log(JSON.stringify(rank, undefined, 1));
  return rank;
}

module.exports = {
  calcRank,
  calcNewRank
}
