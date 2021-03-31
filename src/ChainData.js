const KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS = 3600;

module.exports = class ChainData {
  
  constructor(handler) {
    this.handler = handler;
  }
  
  getAllNominations = async () => {
    const api = await this.handler.getApi();
    let nominators = await api.query.staking.nominators.entries();

    nominators = await Promise.all(
      nominators.map((nominator) => 
        api.derive.balances.all(nominator[0].toHuman()[0]).then((balance) => {
          return {
            ...nominator,
            balance: {
              lockedBalance: balance.lockedBalance,
              freeBalance: balance.freeBalance
            }
          }
        })
      )
    )

    const nominations = nominators.map((nominator) => {
      if(nominator[1] === null) {
        return  {
          nominator: nominator[1],
          targets: [],
          balance: null,
        }
      }
      const accountId = nominator[0].toHuman()[0];
      const targets = nominator[1].toHuman().targets;
      const balance = JSON.parse(JSON.stringify(nominator.balance));
      return {
        accountId,
        targets,
        balance
      }
    })

    return nominations;
  }

  getIdentity = async (address) => {
    const api = await this.handler.getApi();
    const identity = await api.derive.accounts.info(address);
    console.log('identity');
    console.log(JSON.stringify(identity, undefined, 1));
    return identity;
  }

  getAllValidators = async (address) => {
    const api = await this.handler.getApi();

    let validators = [];
    let intentions = [];

    let [
      validatorAddresses,
      waitingInfo,
      // nominators,
    ] = await Promise.all([
      api.query.session.validators(),
      api.derive.staking.waitingInfo(),
      // api.query.staking.nominators.entries(),
    ])

    validators = await Promise.all(
      validatorAddresses.map((authorityId) =>
        api.derive.staking.query(authorityId, {
          withDestination: false,
          withExposure: true,
          withLedger: true,
          withNominations: true,
          withPrefs: true,
        })
      )
    )
    validators = await Promise.all(
      validators.map((validator) =>
        api.derive.accounts.info(validator.accountId).then(({ identity }) => {
          identity.judgements = []; // remove it to avoid cache error
          validator.rewardDestination = {}; // remove it to avoid cache error
          return {
            ...validator,
            identity,
            active: true,
          }
        })
      )
    )
    intentions = await Promise.all(
      JSON.parse(JSON.stringify(waitingInfo.info)).map((intention) =>
        api.derive.accounts.info(intention.accountId).then(({ identity }) => {
          identity.judgements = []; // remove it to avoid cache error
          intention.rewardDestination = {}; // remove it to avoid cache error
          return {
            ...intention,
            identity,
            active: false,
          }
        })
      )
    )
    // nominators = await Promise.all(
    //   nominators.map((nominator) => 
    //     api.derive.balances.all(nominator[0].toHuman()[0]).then((balance) => {
    //       return {
    //         ...nominator,
    //         balance: {
    //           lockedBalance: balance.lockedBalance,
    //           freeBalance: balance.freeBalance
    //         }
    //       }
    //     })
    //   )
    // )
    // const nominations = nominators.map((nominator) => {
    //   if(nominator[1] === null) {
    //     return  {
    //       nominator: nominator[1],
    //       targets: [],
    //       balance: null,
    //     }
    //   }
    //   const accountId = nominator[0].toHuman()[0];
    //   const targets = nominator[1].toHuman().targets;
    //   const balance = JSON.parse(JSON.stringify(nominator.balance));
    //   return {
    //     accountId,
    //     targets,
    //     balance
    //   }
    // })
    console.log(validators)
    return {
      validators: validators.concat(intentions),
      // nominations
    }
  }

}
