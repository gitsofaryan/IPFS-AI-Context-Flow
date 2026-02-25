import { create } from '@storacha/client';

export class StorachaService {
    /**
     * Uploads agent memory to Storacha.
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
     * Fetches memory from a given CID.
     * Note: In production, you might want to use a gateway or the client's retrieve method.
     */
    static getGatewayUrl(cid: string): string {
        return `https://storacha.link/ipfs/${cid}`;
    }
}
