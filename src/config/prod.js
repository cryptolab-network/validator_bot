module.exports = {
  PORT: process.env.PORT,
  API_WSS: process.env.API_WSS,
  // POLKADOT_WSS: process.env.POLKADOT_WSS,
  TG_TOKEN: process.env.TG_TOKEN,
  MONGO_ACCOUNT: process.env.MONGO_ACCOUNT,
  MONGO_PASSWORD: process.env.MONGO_PASSWORD,
  MONGO_URL: process.env.MONGO_URL,
  MONGO_PORT: process.env.MONGO_PORT,
  MONGO_DBNAME: process.env.MONGO_DBNAME,
  TELEMETRY_1KV: process.env.TELEMETRY_1KV,
  TELEMETRY_OFFICIAL: process.env.TELEMETRY_OFFICIAL,
  CHAIN: process.env.CHAIN,
  CHAIN_DECIMAL: (typeof process.env.CHAIN_DECIMAL === 'number' ? process.env.CHAIN_DECIMAL : parseInt(process.env.CHAIN_DECIMAL))
}