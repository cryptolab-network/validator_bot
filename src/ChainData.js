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

}
