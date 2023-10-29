import { FireblocksWeb3Provider, ChainId, ApiBaseUrl } from "@fireblocks/fireblocks-web3-provider";
import { EthersAdapter, SafeFactory } from '@safe-global/protocol-kit'
import Safe from "@safe-global/protocol-kit";
import { configDotenv } from "dotenv";
import * as ethers from "ethers"
import SafeApiKit from '@safe-global/api-kit'
import { GelatoRelayPack } from '@safe-global/relay-kit'
import {abi } from "./abi.js"

configDotenv();

async function setup() {

    const eip1193Provider = new FireblocksWeb3Provider({
        privateKey: process.env.FIREBLOCKS_API_PRIVATE_KEY_PATH,
        apiKey: String(process.env.FIREBLOCKS_API_KEY),
        vaultAccountIds: 0,
        chainId: ChainId.GOERLI,
        apiBaseUrl: ApiBaseUrl.Sandbox,
        logTransactionStatusChanges: true,
    })

    const provider = new ethers.providers.Web3Provider(eip1193Provider);
    const signer = provider.getSigner();

	const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer
    });

    return [provider, signer, ethAdapter];
}

async function intiateApiKit() {
	const [,,ethAdapter] = await setup();

	const txServiceUrl = 'https://safe-transaction-goerli.safe.global'
    const safeService = new SafeApiKit.default({ txServiceUrl, ethAdapter });

	// Initialize the Safe API Kit

	console.log("// Initialize the Safe API Kit")

	return safeService;
}


async function intiateProtocolKit() {
	const [,,ethAdapter] = await setup();

    // // Initialize the Protocol Kit

	console.log("// Initialize the Protocol Kit")
    const safeFactory = await SafeFactory.create({ ethAdapter });

	return safeFactory;
}

async function intiateSafeCoreSDK() {
	const [,,ethAdapter] = await setup()

	// Initiate Safe Core SDK
	console.log("// Initiate Safe Core SDK")
	const safeSdk = await Safe.default.create({ ethAdapter });

	return safeSdk;
}

async function deploySafe() {

	const safeFactory = await intiateProtocolKit();

    const safeAccountConfig = {
        owners: [await signer.getAddress()],
        threshold: 1,
    }

	// deploy safe
	console.log("// deploy safe")
    const deployedSafe = await safeFactory.deploySafe({ safeAccountConfig })

	const safeAddress = await deployedSafe.getAddress();

	console.log('Safe Address: ', safeAddress);

	return safeAddress;
}

async function createTransaction(safeAddress) {
		const [provider, signer] = await setup();
		const safeService = await intiateApiKit();
		const safeSdk = await intiateSafeCoreSDK();
		// create transaction
		console.log("// create transaction")
		const nonce = await safeService.getNextNonce(safeAddress);

		console.log('nonce: ', nonce);

		const myToken = "0xd6981777F89aCD65bcD4deEE1EF78f40331AF80c";

		const address = await signer.getAddress();
		const balance = await provider.getBalance(address);

		console.log("etherBalance: ", balance);

		const contract = new ethers.Contract(myToken, abi, signer)

		const amount = 199446851080883354501n;

		const safeTransactionData = {
			to: contract.address,
			data: contract.interface.encodeFunctionData('mint', [
				safeAddress,
				amount,
			]),
			value: "0",
			nonce, 
		};

		console.log(safeTransactionData)

		const safeTransaction = await safeSdk.createTransaction({ safeTransactionData });

		return safeTransaction;
}


async function proposeTransaction(safeAddress) {
	const [, signer,] = await setup();
	const safeSdk = await intiateSafeCoreSDK();
	const safeService = await intiateApiKit();
	const safeTransaction = await createTransaction(safeAddress);

	// propose transaction
	console.log("// propose transaction")
	const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);
	console.log("safeTxHash: ", safeTxHash);

	// const safeTxHash = "0xae9dc9cbbae8639fd1fee7cb0aba7c6e0b54e6abd5e7d8a5c270ece34e239c8f";

	const senderSignature = await safeSdk.signTransactionHash(safeTxHash);

	await safeService.proposeTransaction({
		safeAddress,
		safeTransactionData: safeTransaction.data,
		safeTxHash,
		senderAddress: await signer.getAddress(),
		senderSignature: senderSignature.data,
		nonce: 1
	})

	return;
}

async function relayTransaction(safeAddress) {
		const [, signer,] = await setup();
		const safeSdk = await intiateSafeCoreSDK();
		const safeService = await intiateApiKit();
		// const safeTransaction = await createTransaction(safeAddress);

		// propose transaction
		console.log("// propose transaction")
		// const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);
		// console.log("safeTxHash: ", safeTxHash);
		const nonce = await safeService.getNextNonce(safeAddress);
		const myToken = "0xd6981777F89aCD65bcD4deEE1EF78f40331AF80c";
		const amount = 199446851080883354501n;
		const contract = new ethers.Contract(myToken, abi, signer)

		const safeTransactionData = {
			to: contract.address,
			data: contract.interface.encodeFunctionData('mint', [
				safeAddress,
				amount,
			]),
			value: "0",
			nonce, 
		};
		
		const options = {
			isSponsored: true
		}

		const relayKit = new GelatoRelayPack(process.env.GELATO_RELAY_API_KEY)
		// const senderSignature = await safeSdk.signTransactionHash(safeTxHash);
		const safeTransaction = await relayKit.createRelayedTransaction({
			safe: safeSdk,
			transactions: [safeTransactionData],
			options
		  })
		  
		const signedSafeTransaction = await safeSdk.signTransaction(safeTransaction)
		// await safeService.proposeTransaction({
		// 	safeAddress,
		// 	safeTransactionData: safeTransaction.data,
		// 	safeTxHash,
		// 	senderAddress: await signer.getAddress(),
		// 	senderSignature: senderSignature.data,
		// 	nonce: 1
		// })
		const response = await relayKit.executeRelayTransaction(signedSafeTransaction, safeSdk, options)

		console.log(`Relay Transaction Task ID: https://relay.gelato.digital/tasks/status/${response.taskId}`)

		return;
}


async function test(safeAddress) {
	const safeSdk = await intiateSafeCoreSDK();
	const safeService = await intiateApiKit();
	const pendingTxs = await safeService.getPendingTransactions(safeAddress);
	console.log("pendingTxs:", pendingTxs.results);
	const safeTransaction = await safeService.getTransaction(pendingTxs.results[0].safeTxHash)
	const isTxExecutable = await safeSdk.isValidTransaction(safeTransaction);
	
	if (isTxExecutable) {
		// Execute the transaction
		const txResponse = await safeSdk.executeTransaction(safeTransaction)
		const contractReceipt = await txResponse.transactionResponse?.wait()
	
		console.log('Transaction executed.')
		console.log('- Transaction hash:', contractReceipt?.transactionHash)
	  } else {
		console.log('Transaction invalid. Transaction was not executed.')
	  }

	
}

async function getTransactionHash(safeAddress) {
	const safeSdk = await intiateSafeCoreSDK();
	const safeService = await intiateApiKit();
	// const safeTxHash = await proposeTransaction(safeAddress);
	// Get a list of pending transactions
	// const pendingTxs = await safeService.getPendingTransactions(safeAddress);
	const safeTxHash = "0x05186a06320a12e9b7f51f97e8530d75824852eb1637c01371c8383aa381ceec";
	// Get a specific transaction given its Safe transaction hash
	console.log("// Get a specific transaction given its Safe transaction hash")
	const specificTx = await safeService.getTransaction(safeTxHash)

	// Confirm/reject the transaction
	console.log("// Confirm/reject the transaction")
	const hash = specificTx.safeTxHash
	console.log('hash: ', hash);
	
	let signature = await safeSdk.signTransactionHash(hash);
	const confirmedTx = await safeService.confirmTransaction(hash, signature.data);
	console.log("confirmedTx:", confirmedTx)
	return confirmedTx;
}


async function executeTransaction(safeAddress) {
	const safeSdk = await intiateSafeCoreSDK();
	// const confirmedTx = await getTransactionHash();
	const safeTransaction = await createTransaction(safeAddress);
	// execute the transaction
	console.log("// execute the transaction")

	// const confirmedTx = await safeService.getTransaction(hash);
	const executeTxResponse = await safeSdk.executeTransaction(safeTransaction);

	const receipt = executeTxResponse.transactionResponse && (await executeTxResponse.transactionResponse.wait());

	console.log('receipt: ', receipt);

	// validate transaction
	console.log("// validate transaction")
	const isValidTx = await safeSdk.isValidTransaction(safeTransaction);

	console.log('isValidTx: ', isValidTx);
}

(async function() {
    try {
		// await intiateApiKit();
        // await createTransaction("0x4a69381a79faaadb692Dc0E8C37D14fc29dC5418");
		await proposeTransaction("0x4a69381a79faaadb692Dc0E8C37D14fc29dC5418");
		// await getTransactionHash();
		// await relayTransaction("0x4a69381a79faaadb692Dc0E8C37D14fc29dC5418");
		// await executeTransaction("0x4a69381a79faaadb692Dc0E8C37D14fc29dC5418");
		// await test("0x4a69381a79faaadb692Dc0E8C37D14fc29dC5418");
    } catch (error) {
        console.log(error);
        process.exitCode = 1;
    }
})();