import { create } from '@storacha/client';

export class StorachaService {
    /**
     * Uploads agent memory to Storacha's decentralized IPFS network.
     * @param memory The JSON object representing the agent's context.
     * @returns The CID of the uploaded content.
     */
    static async uploadMemory(memory: object): Promise<string> {
        const client = await create();

        // Convert object to a File-like object
        const blob = new Blob([JSON.stringify(memory)], { type: 'application/json' });
        const files = [new File([blob], 'memory.json')];

        console.log("Uploading memory to Storacha...");
        const cid = await client.uploadDirectory(files);

        return cid.toString();
    }

    /**
     * Fetches agent memory from IPFS using a CID.
     * @param cid The content identifier of the stored memory.
     * @returns The parsed JSON object, or null if fetch fails.
     */
    static async fetchMemory(cid: string): Promise<object | null> {
        const url = StorachaService.getGatewayUrl(cid) + '/memory.json';

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        } catch (err) {
            console.error(`Failed to fetch memory from CID ${cid}:`, err);
            return null;
        }
    }

    /**
     * Builds the IPFS gateway URL for a given CID.
     * @param cid The content identifier.
     * @returns The full gateway URL.
     */
    static getGatewayUrl(cid: string): string {
        return `https://storacha.link/ipfs/${cid}`;
    }
}
