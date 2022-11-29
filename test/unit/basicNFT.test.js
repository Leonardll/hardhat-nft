const { assert } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip()
    : describe("BasicNFT Unit Test", function () {
          let basicNFT, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["basicnft"])
              basicNFT = await ethers.getContract("BasicNFT")
          })
          describe("Constructor", () => {
              it("initializes the NFT Correctly.", async function () {
                  const name = await basicNFT.name()
                  const symbol = await basicNFT.symbol()
                  const tokenCounter = await basicNFT.getTokenCounter()
                  assert.equal(name, "Dogie")
                  assert.equal(symbol, "DOG")
                  assert.equal(tokenCounter, 0)
              })
          })
      })
