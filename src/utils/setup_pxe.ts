import { createPXEService, getPXEServiceConfig } from '@aztec/pxe/server';
import { createStore } from "@aztec/kv-store/lmdb";
import { createAztecNodeClient, waitForPXE } from '@aztec/aztec.js';

export const setupPXE = async () => {
    // Always use sandbox node at localhost:8080
    const NODE_URL = 'http://localhost:8080';
    const node = createAztecNodeClient(NODE_URL);
    const l1Contracts = await node.getL1ContractAddresses();
    const config = getPXEServiceConfig();
    const fullConfig = { ...config, l1Contracts, proverEnabled: false };

    const store = await createStore('pxe', {
        dataDirectory: 'store',
        dataStoreMapSizeKB: 1e6,
    });

    const pxe = await createPXEService(node, fullConfig, { store });
    await waitForPXE(pxe);
    return pxe;
};