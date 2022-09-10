const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("./getWeth")

async function main() {
    //the protocol treats everything as an ERC20 token
    await getWeth()
    const { deployer } = await getNamedAccounts()
    // Lending Pool address provider :   "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5"

    const lendingPool = await getLendindPool(deployer)
    console.log(`LendingPool Address ${lendingPool.address}`)
    // deposit

    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    // approve function
    await approveERC20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing...")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Deposited...")

    // borrow
    // how much we have borrowed, how much we have in collateral, how much we can borrow
    let { availableBorrowsETH, totalDebtETH } = await getBorrowedUser(lendingPool, deployer)
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`You can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    // borrow Time !!!!!
    const daiTokenAddress = "0x6b175474e89094c44da98b954eedeac495271d0f"
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)

    await getBorrowedUser(lendingPool, deployer)

    //repay!!!!
    await repay(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getBorrowedUser(lendingPool, deployer)
}

async function getLendindPool(account) {
    const lendingPoolAddressProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

async function approveERC20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!")
}

async function getBorrowedUser(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH`)
    return { totalCollateralETH, totalDebtETH, availableBorrowsETH }
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)

    await borrowTx.wait(1)
    console.log("You have borrowed!")
}

async function repay(daiAddress, lendingPool, amount, account) {
    await approveERC20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)

    await repayTx.wait(1)
    console.log("You have repayed!! YAY!!!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH Price is ${price.toString()}`)
    return price
}

main().catch((error) => {
    console.log(error)
    process.exit(1)
})
