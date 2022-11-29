const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

const imagesLocation = "./images/randomNft"

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Background",
            value: 100,
        },
    ],
}
let tokenUris = [
    "ipfs://QmYN6QEKqjLJLsVdhWhuvFi6uDkdUyVv7wZkLwRNjEM5So",
    "ipfs://QmTV3QCSXC3beruH93w3VRezhmhVN9xz1WLyTm3RwERoJi",
    "ipfs://QmULeprCmmDCUuLcBWpu49zRowynpbKxAcfAwDxTbs1DZa",
]
const FUND_AMOUNT = ethers.utils.parseEther("1")
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // get IPFS hashes of our images
    if (process.env.UPLOAD_TO_PINATA === "true") {
        tokenUris = await handleTokenUris()
    }
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await tx.wait()
        subscriptionId = transactionReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
        log("Verifying RandomIpfsNft")
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }
    log("--------------")
    //await storeImages(imagesLocation)
    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["callbackGasLimit"],
        tokenUris,
        networkConfig[chainId]["mintFee"],
    ]
    // log(args)

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    //log(randomIpfsNft)
    log("----------------------")
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfsNft.address, args)
    }
    // const args = [
    //     vrfCoordinatorV2Address,
    //     subscribtionId,
    //     networkConfig[chainId].gasLane,
    //     networkConfig[chainId].callbackGasLimit,

    //     networkConfig[chainId].mintFee,
    // ]
}

async function handleTokenUris() {
    tokenUris = []

    // store images in IPFS
    // store metadata in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    for (imageUploadResponseIndex in imageUploadResponses) {
        //create metadata
        //upload metadata
        let tokenUriMetadata = { ...metadataTemplate }
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name}pup!`
        tokenUriMetadata.image = imageUploadResponses[imageUploadResponseIndex].IpfsHash
        console.log(`Uploading metadata for ${tokenUriMetadata.name}...`)
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs uploaded, They are:")
    console.log(tokenUris)
    return tokenUris
}
module.exports.tags = ["all", "randomipfs", "main"]
