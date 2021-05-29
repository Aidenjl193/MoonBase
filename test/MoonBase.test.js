const BigNumber = web3.utils.BN;
const Chance = require('chance');
const MoonBase = artifacts.require('MoonBase');
const Router = artifacts.require('UniswapV2Router02.sol');
const Factory = artifacts.require("UniswapV2Factory");

require('chai')
    .use(require('chai-bn')(BigNumber))
    .should();

// Wrap users for convenience
const user = (_address, _token) => {
    return {
        address: _address,
        getBalance: async () => {
            return _token.balanceOf.call(_address);
        },
        getIsExcludedFromFee: async () => {
            return _token.isExcludedFromFee.call(_address);
        },
        getIsExcludedFromReward: async () => {
            return _token.isExcludedFromReward.call(_address);
        },
        transferTo: async (amount, recipient) => {
            return _token.transfer(recipient.address, amount, { from: _address });
        },
        transferToAddress: async (amount, recipientAddr) => {
            return _token.transfer(recipientAddr, amount, { from: _address });
        }
    };
}

contract('MoonBase', accounts => {

    const _name = 'MoonBase';
    const _symbol = 'MBASE';
    const _decimals = '9';
    const _totalSupply = '1000000000000000000000000';
    const _totalReflectionSupply = '1000';

    const _taxFee = new BigNumber('5');
    const _liquidityFee = new BigNumber('5');

    const transactionAfterTax = (transactionAmount) => {
        return transactionAmount.sub(
            transactionAmount.mul(_taxFee.add(_liquidityFee)).div(new BigNumber('100'))
        );
    };

    const getRandomUsers = (amount) => {
        return this.chance.pickset(this.users, amount);
    };

    beforeEach(async() => {

        this.chance = new Chance();

        this.token = await MoonBase.deployed();
        this.deployer = user(accounts[0], this.token);

        this.users = accounts.slice(1, accounts.length).map(address => {
            return user(address, this.token);
        });

    });

    describe('token attributes', () => {

        it('has the correct name', async () => {
            const name = await this.token.name();
            name.should.equal(_name);
        });

        it('has the correct symbol', async () => {
            const symbol = await this.token.symbol();
            symbol.should.equal(_symbol);
        });

        it('has the correct decimals', async () => {
            const decimals = await this.token.decimals();
            decimals.should.be.a.bignumber.that.equals(_decimals);
        });

        it('has the correct total supply', async () => {
            const totalSupply = await this.token.totalSupply();
            totalSupply.should.be.a.bignumber.that.equals(_totalSupply);
        });

    });

    describe('token creation', () => {

        it('should transfer all tokens to the deployer', async () => {
            const balance = await this.deployer.getBalance();
            balance.should.be.a.bignumber.that.equals(_totalSupply);
        })

        it('should exclude the deployer from tax', async () => {
            const isExcludedFromFee = await this.deployer.getIsExcludedFromFee();
            isExcludedFromFee.should.equal(true);
        });

        it('should include the deployer in reward', async () => {
            const isExcludedFromReward = await this.deployer.getIsExcludedFromReward();
            isExcludedFromReward.should.equal(false);
        });

        it('should have 0 total fees', async() => {
            const totalFees = await this.token.totalFees();
            totalFees.should.be.a.bignumber.that.equals('0');
        });

        it('should include new accounts in tax', async () => {
            const [user] = getRandomUsers(1);
            const isExcludedFromFee = await user.getIsExcludedFromFee();
            isExcludedFromFee.should.equal(false);
        });

        it('should include new accounts in reward', async () => {
            const [user] = getRandomUsers(1);
            const isExcludedFromReward = await user.getIsExcludedFromReward();
            isExcludedFromReward.should.equal(false);
        });

    });

    describe('transfer', () => {

        describe('tax', () => {

            it('should not tax the deployer on a transfer', async () => {
                const [recipient] = getRandomUsers(1);

                const transferAmount = new BigNumber('1000');
                await this.deployer.transferTo(transferAmount, recipient);

                const finalBalance = await recipient.getBalance();
                finalBalance.should.be.a.bignumber.that.equals(transferAmount);
            });

            it('should tax non-excluded users', async () => {
                const [sender, recipient] = getRandomUsers(2);

                const transferAmount = new BigNumber('1000');
                await sender.transferTo(transferAmount, recipient);

                const finalBalance = await recipient.getBalance();
                finalBalance.should.be.a.bignumber.that.equals(transactionAfterTax(transferAmount));
            });

        });

        describe('relfection', () => {

        });


    });

})