import { AztecAddress, Fr, SponsoredFeePaymentMethod } from "@aztec/aztec.js";
import { setupPXE } from "../src/utils/setup_pxe.js";
import { getSingleAccountFromEnv } from "../src/utils/create_account.js";
import { getSponsoredFPCInstance } from "../src/utils/sponsored_fpc.js";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import fs from "fs";
import { FiatCMTATokenContract } from "../src/artifacts/FiatCMTAToken.js";

// Use Fr and toField for role and amount
const MINTER_ROLE = new Fr(2).toField(); // Or use the correct value for your contract

async function main() {
    const pxe = await setupPXE();

    // Register SponsoredFPC and set up sponsored fee payment
    const sponsoredFPC = await getSponsoredFPCInstance();
    await pxe.registerContract({ instance: sponsoredFPC, artifact: SponsoredFPCContract.artifact });
    const sponsoredPaymentMethod = new SponsoredFeePaymentMethod(sponsoredFPC.address);

    // Get deployer (admin) and second account directly
    const deployer = await getSingleAccountFromEnv(pxe, 1);
    const secondAccount = await getSingleAccountFromEnv(pxe, 2);

    // Get contract address from contracts.json (latest entry)
    const contracts = JSON.parse(fs.readFileSync("./contracts.json", "utf-8"));
    const contractAddress = AztecAddress.fromString(contracts[contracts.length - 1].contractAddress);

    // Get wallet from deployer
    const wallet = await deployer.getWallet();

    // Connect to contract
    const contract = await FiatCMTATokenContract.at(contractAddress, wallet);

    // Grant MINTER_ROLE to deployer (if not already)
    const deployerAddress = await deployer.getAddress();
    await contract.methods.grant_role(MINTER_ROLE, deployerAddress)
        .send({ fee: { paymentMethod: sponsoredPaymentMethod } }).wait();

    // Mint tokens to second account
    const secondAddress = await secondAccount.getAddress();
    const mintAmount = new Fr(1000).toField(); // Use toField for amount

    await contract.methods.mint(secondAddress, mintAmount)
        .send({ fee: { paymentMethod: sponsoredPaymentMethod } }).wait();

    console.log(`Granted MINTER_ROLE to ${deployerAddress.toString()} and minted ${mintAmount.toString()} tokens to ${secondAddress.toString()}`);
}

main().catch(console.error);