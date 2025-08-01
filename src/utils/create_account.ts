import { Fr, PXE, AccountManager } from "@aztec/aztec.js";
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { deriveSigningKey } from '@aztec/stdlib/keys';
import { getSponsoredFPCInstance } from "./sponsored_fpc.js";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee/testing";
import * as dotenv from 'dotenv';

dotenv.config();

export async function createAccountFromEnv(pxe: PXE, number: number): Promise<AccountManager[]> {
  if (number <= 0) throw new Error('Number of accounts must be greater than 0');
  const accounts: AccountManager[] = [];

  for (let i = 1; i <= number; i++) {
    const secretEnv = process.env[`SECRET${i}`];
    const saltEnv = process.env[`SALT${i}`];
    if (!secretEnv || !saltEnv) throw new Error(`SECRET${i} and SALT${i} must be set in .env`);

    const secretKey = Fr.fromString(secretEnv);
    const salt = Fr.fromString(saltEnv);
    const schnorrAccount = await getSchnorrAccount(pxe, secretKey, deriveSigningKey(secretKey), salt);
    const accountAddress = schnorrAccount.getAddress();

    // Deploy if not registered
    const registered = (await pxe.getRegisteredAccounts()).some(acc => acc.address.equals(accountAddress));
    if (!registered) {
      const sponsoredFPC = await getSponsoredFPCInstance();
      await pxe.registerContract({ instance: sponsoredFPC, artifact: SponsoredFPCContract.artifact });
      const sponsoredPaymentMethod = new SponsoredFeePaymentMethod(sponsoredFPC.address);
      await schnorrAccount.deploy({ fee: { paymentMethod: sponsoredPaymentMethod } }).wait({ timeout: 120000 });
    }

    accounts.push(schnorrAccount);
  }
  return accounts;
}

export async function getSingleAccountFromEnv(pxe: PXE, accountIndex: number = 1): Promise<AccountManager> {
  return (await createAccountFromEnv(pxe, accountIndex))[accountIndex - 1];
}