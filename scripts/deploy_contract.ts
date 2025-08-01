import { FiatCMTATokenContract } from "../src/artifacts/FiatCMTAToken.js"
import { createLogger, PXE, Logger, SponsoredFeePaymentMethod } from "@aztec/aztec.js";
import { setupPXETestnet } from "../src/utils/setup_pxe_testnet.js";
import { setupPXE } from "../src/utils/setup_pxe.js";
import { getSponsoredFPCInstance } from "../src/utils/sponsored_fpc.js";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import { getSingleAccountFromEnv } from "../src/utils/create_account.js";
import fs from "fs";

async function main() {
    let logger: Logger = createLogger('aztec:aztec-starter');
    const pxe = await setupPXE();

    const sponsoredFPC = await getSponsoredFPCInstance();
    await pxe.registerContract({ instance: sponsoredFPC, artifact: SponsoredFPCContract.artifact });
    const sponsoredPaymentMethod = new SponsoredFeePaymentMethod(sponsoredFPC.address);

    // Use the first account from .env as deployer/admin
    const accountManager = await getSingleAccountFromEnv(pxe, 1);
    const wallet = await accountManager.getWallet();
    const address = await accountManager.getAddress();

    const tokenName = 'FiatCMTAToken';
    const tokenSymbol = 'FCMTAT';
    const tokenCurrency = 'USD';
    const tokenDecimals = 18n;

    const tokenContract = await FiatCMTATokenContract.deploy(
        wallet, tokenName, tokenSymbol, tokenCurrency, tokenDecimals, address
    ).send({ fee: { paymentMethod: sponsoredPaymentMethod } }).deployed({ timeout: 120000 });

    logger.info(`CMTAT Token Contract deployed at: ${tokenContract.address}`);

    // Minimal contract info
    const contractInfo = {
        contractAddress: tokenContract.address.toString(),
        deployer: address.toString(),
        constructor: {
            tokenName,
            tokenSymbol,
            tokenCurrency,
            tokenDecimals: tokenDecimals.toString(),
            admin: address.toString()
        }
    };

    // Save to contracts.json (append or create array)
    let contracts: any[] = [];
    if (fs.existsSync("./contracts.json")) {
        contracts = JSON.parse(fs.readFileSync("./contracts.json", "utf-8"));
    }
    contracts.push(contractInfo);
    fs.writeFileSync("./contracts.json", JSON.stringify(contracts, null, 2));
}

main();