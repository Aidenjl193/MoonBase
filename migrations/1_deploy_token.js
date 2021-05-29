const MoonBase = artifacts.require('MoonBase');
const Factory = artifacts.require("UniswapV2Factory");
const Router = artifacts.require('UniswapV2Router02.sol');

module.exports = async function (deployer, network, addresses) {
  await deployer.deploy(Factory, addresses[0]);
  const factory = await Factory.deployed();

  const WETH_ADDRESS = addresses[1];

  await deployer.deploy(Router, factory.address, WETH_ADDRESS);
  const router = await Router.deployed()

  await deployer.deploy(MoonBase, router.address);
};
