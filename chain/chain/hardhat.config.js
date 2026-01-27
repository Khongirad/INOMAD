require("@nomicfoundation/hardhat-ethers");

module.exports = {
  defaultNetwork: "localhost",
solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://127.0.0.1:8546",
      allowUnlimitedContractSize: true,
    },
  },
};
