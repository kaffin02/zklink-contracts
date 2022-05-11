const hardhat = require('hardhat');
const { expect } = require('chai');

describe('Governance unit tests', function () {
    let testContract;
    let alice, bob, jack;
    before(async () => {
        [alice, bob, jack] = await hardhat.ethers.getSigners();
        const contractFactory = await hardhat.ethers.getContractFactory('Governance');
        testContract = await contractFactory.connect(alice).deploy();
        await testContract.initialize(
            hardhat.ethers.utils.defaultAbiCoder.encode(['address'], [alice.address])
        );
        expect(await testContract.networkGovernor()).to.equal(alice.address);
    });

    it('Change governance should success', async () => {
        await testContract.connect(alice).changeGovernor(bob.address);
        expect(await testContract.networkGovernor()).to.equal(bob.address);

        await expect(testContract.connect(bob).changeGovernor(hardhat.ethers.constants.AddressZero)).to.be.revertedWith('G1');
    });

    it('Add token should success', async () => {
        const tokenId = 1;
        const tokenAddress = '0x823B747710C5bC9b8A47243f2c3d1805F1aA00c5';
        await expect(testContract.connect(jack).addToken(tokenId, tokenAddress)).to.be.revertedWith("G0");

        await expect(testContract.connect(bob).addToken(0, tokenAddress)).to.be.revertedWith("G2");
        await expect(testContract.connect(bob).addToken(8192, tokenAddress)).to.be.revertedWith("G2");
        await expect(testContract.connect(bob).addToken(tokenId, hardhat.ethers.constants.AddressZero)).to.be.revertedWith("G3");

        await testContract.connect(bob).addToken(tokenId, tokenAddress);
        const rt = await testContract.getToken(tokenId);
        expect(rt.registered).equal(true);
        expect(rt.paused).equal(false);
        expect(rt.tokenAddress).equal(tokenAddress);
        expect(await testContract.getTokenId(tokenAddress)).to.eq(tokenId);

        // duplicate register
        await expect(testContract.connect(bob).addToken(tokenId, tokenAddress)).to.be.revertedWith('G4');
        const anotherTokenId = 2;
        await expect(testContract.connect(bob).addToken(anotherTokenId, tokenAddress)).to.be.revertedWith('G5');
    });

    it('Set token pause should success', async () => {
        const tokenId = 1;
        await expect(testContract.connect(jack).setTokenPaused(tokenId, true)).to.be.revertedWith("G0");
        await expect(testContract.connect(bob).setTokenPaused(2, true)).to.be.revertedWith("G7");

        expect(await testContract.connect(bob).setTokenPaused(tokenId, true))
            .to.be.emit(testContract.address, 'TokenPausedUpdate');
        const rt = await testContract.getToken(tokenId);
        expect(rt.paused).equal(true);
    });

    it('Set token address should success', async () => {
        const tokenId = 1;
        const oldTokenAddress = '0x823B747710C5bC9b8A47243f2c3d1805F1aA00c5';
        const newTokenAddress = '0x807a0774236a0fbe9e7f8e7df49edfed0e6777ea';
        const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        await expect(testContract.connect(jack).setTokenAddress(tokenId, newTokenAddress)).to.be.revertedWith("G0");
        await expect(testContract.connect(bob).setTokenAddress(tokenId, hardhat.ethers.constants.AddressZero)).to.be.revertedWith("G8");
        await expect(testContract.connect(bob).setTokenAddress(tokenId, ethAddress)).to.be.revertedWith("G8");
        await expect(testContract.connect(bob).setTokenAddress(2, newTokenAddress)).to.be.revertedWith("G9");
        await expect(testContract.connect(bob).setTokenAddress(tokenId, oldTokenAddress)).to.be.revertedWith("G10");

        expect(await testContract.connect(bob).setTokenAddress(tokenId, newTokenAddress))
            .to.be.emit(testContract.address, 'TokenAddressUpdate');
        const rt = await testContract.getToken(tokenId);
        expect(rt.tokenAddress.toLowerCase()).equal(newTokenAddress.toLowerCase());

        // eth token update disabled
        const ethId = 2;
        await testContract.connect(bob).addToken(ethId, ethAddress);
        const anotherNewTokenAddress = '0x72847c8bdc54b338e787352bcec33ba90cd7afe0';
        await expect(testContract.connect(bob).setTokenAddress(ethId, anotherNewTokenAddress)).to.be.revertedWith("G11");
    });

    it('Set validator should success', async () => {
        await expect(testContract.connect(bob).setValidator(jack.address, true))
            .to.emit(testContract, 'ValidatorStatusUpdate')
            .withArgs(jack.address, true);

        await expect(testContract.connect(bob).setValidator(jack.address, false))
            .to.emit(testContract, 'ValidatorStatusUpdate')
            .withArgs(jack.address, false);
    });

    it('Set bridge manager should success', async () => {
        await expect(testContract.connect(bob).setBridgeManager(jack.address))
            .to.emit(testContract, 'BridgeManagerUpdate')
            .withArgs(jack.address);
    });
});
