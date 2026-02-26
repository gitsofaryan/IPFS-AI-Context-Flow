import express from 'express';
import cors from 'cors';
import { UcanService } from '../lib/ucan.js';
import { StorachaService } from '../lib/storacha.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════
// REGISTRY & STORAGE (In production, this is a database e.g., PostgreSQL)
// ═══════════════════════════════════════════════════════════════════

// Stores delegations distributed to agents: delegationId → { base64Token, issuerDid, audienceDid, ability, memoryCids, createdAt }
const delegationStore: Map<string, {
    base64Token: string;
    issuerDid: string;
    audienceDid: string;
    ability: string;
    memoryCids: string[];
    createdAt: string;
}> = new Map();

// Stores memory metadata: cid → { ownerDid, createdAt, visibility, name, description }
const memoryIndex: Map<string, {
    ownerDid: string;
    createdAt: string;
    visibility: 'public' | 'private';
    name?: string;
    description?: string;
}> = new Map();

let delegationCounter = 0;

// ═══════════════════════════════════════════════════════════════════
// PLATFORM ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Agent Context & Skills Registry',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        stores: {
            delegations: delegationStore.size,
            memories: memoryIndex.size,
            publicSkills: Array.from(memoryIndex.values()).filter(m => m.visibility === 'public').length,
        }
    });
});

/**
 * GET /api/skills
 * Discover public contexts/skills.
 */
app.get('/api/skills', (_req, res) => {
    const publicSkills = Array.from(memoryIndex.entries())
        .filter(([_, meta]) => meta.visibility === 'public')
        .map(([cid, meta]) => ({
            cid,
            name: meta.name || 'Unnamed Skill',
            description: meta.description || '',
            ownerDid: meta.ownerDid,
            createdAt: meta.createdAt
        }));

    res.json({ skills: publicSkills, count: publicSkills.length });
});

/**
 * POST /api/memory
 * Publish / Pin agent context.
 * In a production architecture, the server acts ONLY as a pinning service or indexer.
 * It does NOT hold private keys.
 */
app.post('/api/memory', async (req, res) => {
    const { did, context, visibility = 'private', name, description } = req.body;

    if (!did || !context) {
        return res.status(400).json({ error: 'Missing required fields: did, context' });
    }

    try {
        const payload = {
            agent_id: did,
            timestamp: new Date().toISOString(),
            context,
        };

        let cid: string;
        let simulated = false;

        try {
            cid = await StorachaService.uploadMemory(payload);
        } catch {
            const crypto = await import('crypto');
            const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('base64').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 32);
            cid = `bafybeisim1${hash}`;
            simulated = true;
        }

        memoryIndex.set(cid, {
            ownerDid: did,
            createdAt: new Date().toISOString(),
            visibility,
            name,
            description
        });

        res.json({
            cid,
            gatewayUrl: StorachaService.getGatewayUrl(cid),
            simulated,
            visibility,
            message: simulated
                ? 'Memory stored (simulated)'
                : 'Memory stored on IPFS via Storacha',
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/memory/:cid
 * Fetch memory.
 * Using UCAN token for auth if private.
 */
app.get('/api/memory/:cid', async (req, res) => {
    const { cid } = req.params;
    const authHeader = req.headers.authorization;

    // Check if memory exists in our index
    const memoryMeta = memoryIndex.get(cid);
    if (!memoryMeta) {
        return res.status(404).json({ error: 'Memory not found in index. It may exist on IPFS but is not registered with this service.' });
    }

    // If the memory is public, it can be fetched without authentication
    if (memoryMeta.visibility === 'public') {
        try {
            const memory = await StorachaService.fetchMemory(cid);
            return res.json({
                memory,
                verification: 'public',
                note: 'Memory is public. No UCAN authentication required.',
                meta: memoryMeta,
            });
        } catch (err: any) {
            return res.json({
                memory: null,
                verification: 'public',
                note: 'Memory is public but IPFS fetch failed (CID may be simulated).',
                meta: memoryMeta,
            });
        }
    }

    // If no auth header and memory is private, check if requester is the owner
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authorization required',
            hint: 'This context is private. Provide a UCAN delegation token as: Authorization: Bearer <base64-ucan-token>',
            ownerDid: memoryMeta.ownerDid,
        });
    }

    const base64Token = authHeader.replace('Bearer ', '');

    try {
        // Decode and verify the UCAN delegation
        const delegation = await UcanService.delegationFromBase64(base64Token);

        const verification = UcanService.verifyDelegation(
            delegation,
            memoryMeta.ownerDid,
            'agent/read'
        );

        if (!verification.valid) {
            return res.status(403).json({
                error: 'Authorization denied',
                reason: verification.reason,
            });
        }

        // Authorization passed — fetch from IPFS
        const memory = await StorachaService.fetchMemory(cid);

        if (memory) {
            res.json({
                memory,
                verification: 'passed',
                issuer: delegation.issuer.did(),
                audience: delegation.audience.did(),
            });
        } else {
            // If IPFS fetch fails (e.g., simulated CID), return the metadata
            res.json({
                memory: null,
                verification: 'passed',
                note: 'UCAN verification passed but IPFS fetch failed (CID may be simulated)',
                issuer: delegation.issuer.did(),
                audience: delegation.audience.did(),
                meta: memoryMeta,
            });
        }
    } catch (err: any) {
        res.status(400).json({ error: `Invalid UCAN token: ${err.message}` });
    }
});

/**
 * POST /api/delegations
 * An agent submits a pre-signed UCAN delegation token to grant access to another agent.
 * The server DOES NOT sign this. The client SDK signs it using the user's wallet/DID.
 */
app.post('/api/delegations', async (req, res) => {
    const { ucanBase64, memoryCids = [] } = req.body;

    if (!ucanBase64) {
        return res.status(400).json({ error: 'Missing required field: ucanBase64' });
    }

    try {
        // Decode the UCAN to verify it
        const delegation = await UcanService.delegationFromBase64(ucanBase64);

        const issuerDid = delegation.issuer.did();
        const audienceDid = delegation.audience.did();
        const ability = delegation.capabilities[0]?.can || 'unknown';

        // We verify the delegation is fully valid cryptographically before storing it
        const verification = UcanService.verifyDelegation(delegation, issuerDid, ability as string);
        if (!verification.valid) {
            return res.status(400).json({ error: 'Invalid UCAN delegation', reason: verification.reason });
        }

        const delegationId = `dlg_${++delegationCounter}_${Date.now()}`;

        delegationStore.set(delegationId, {
            base64Token: ucanBase64,
            issuerDid,
            audienceDid,
            ability: ability as string,
            memoryCids,
            createdAt: new Date().toISOString(),
        });

        res.json({
            delegationId,
            message: 'Delegation successfully registered on the platform.',
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/delegations/:audienceDid
 * An agent queries the platform to see if they have been granted any delegations.
 */
app.get('/api/delegations/:audienceDid', (req, res) => {
    const { audienceDid } = req.params;

    // Find all delegations where this DID is the audience
    const list = Array.from(delegationStore.entries())
        .filter(([_, entry]) => entry.audienceDid === audienceDid)
        .map(([id, entry]) => ({
            delegationId: id,
            issuerDid: entry.issuerDid,
            ability: entry.ability,
            memoryCids: entry.memoryCids,
            createdAt: entry.createdAt,
            base64Token: entry.base64Token
        }));

    res.json({ delegations: list, count: list.length });
});

// ═══════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🧠 Agent Context Service — API PROD                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Server running on http://localhost:${PORT}                    ║
║                                                              ║
║  Platform Endpoints:                                         ║
║  ──────────────────────────────────────────────────────────   ║
║  GET  /api/health              Service health check          ║
║  GET  /api/skills              Discover public contexts      ║
║  POST /api/memory              Publish context (public/priv) ║
║  GET  /api/memory/:cid         Fetch context (UCAN auth)     ║
║  POST /api/delegations         Submit UCAN Token             ║
║  GET  /api/delegations/:did    Fetch Tokens for Agent DID    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
});

export default app;
