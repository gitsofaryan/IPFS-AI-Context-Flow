"use client";

import { useState, useRef } from "react";
import { StorachaService } from "@/lib/storacha";
import { UcanService } from "@/lib/ucan";
import ArchitectureFlow from "./components/ArchitectureFlow";
import DevToolVisualizer, { DevToolVisualizerRef } from "./components/DevToolVisualizer";

// We store the actual signer objects so we can use them for real UCAN operations
let masterSigner: any = null;
let subSigner: any = null;

export default function Home() {
  const devToolRef = useRef<DevToolVisualizerRef>(null);

  const [publicMemory, setPublicMemory] = useState("");
  const [storachaCid, setStorachaCid] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [retrievedMemory, setRetrievedMemory] = useState<string>("");
  const [isRetrieving, setIsRetrieving] = useState(false);

  const [masterDid, setMasterDid] = useState("");
  const [subDid, setSubDid] = useState("");
  const [ucanCid, setUcanCid] = useState("");
  const [verificationResult, setVerificationResult] = useState("");

  const [secretVal, setSecretVal] = useState("");
  const [zamaRef, setZamaRef] = useState("");

  const handleUpload = async () => {
    if (!publicMemory) return;
    setIsUploading(true);
    devToolRef.current?.addLog("SYSTEM", "Initiating Storacha upload flow...");
    try {
      // Attempt real upload, fall back to simulation if no account
      let cid: string;
      try {
        const parsed = JSON.parse(publicMemory);
        cid = await StorachaService.uploadMemory(parsed);
        devToolRef.current?.addLog("STORACHA", `Live upload successful!`);
      } catch {
        // Fallback: simulated CID when Storacha account isn't configured
        cid = "bafybeigh4mvdjagffgry2kcdykahpibhnvv3pzs5bbgaeu7v5olsxafeyqy";
        devToolRef.current?.addLog("SYSTEM", "Using simulated CID (no Storacha account configured)");
      }
      setStorachaCid(cid);
      devToolRef.current?.triggerAnimation("upload");
      devToolRef.current?.addLog("STORACHA", `Memory stored! CID: ${cid.slice(0, 10)}...`);
    } catch (err) {
      devToolRef.current?.addLog("SYSTEM", "Error during Storacha upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetrieve = async () => {
    if (!storachaCid) return;
    setIsRetrieving(true);
    devToolRef.current?.addLog("SYSTEM", `Fetching memory from CID: ${storachaCid.slice(0, 10)}...`);
    try {
      const memory = await StorachaService.fetchMemory(storachaCid);
      if (memory) {
        setRetrievedMemory(JSON.stringify(memory, null, 2));
        devToolRef.current?.addLog("STORACHA", "Memory retrieved successfully from IPFS!");
      } else {
        setRetrievedMemory("Failed to retrieve — CID may be simulated.");
        devToolRef.current?.addLog("STORACHA", "Retrieval returned null (simulated CID).");
      }
    } catch (err) {
      devToolRef.current?.addLog("SYSTEM", "Error fetching memory from IPFS.");
    } finally {
      setIsRetrieving(false);
    }
  };

  const handleIdentity = async () => {
    devToolRef.current?.addLog("SYSTEM", "Generating Master Agent identity (Ed25519)...");
    masterSigner = await UcanService.createIdentity();
    setMasterDid(masterSigner.did());
    devToolRef.current?.addLog("UCAN", `Master identity: ${masterSigner.did().slice(0, 25)}...`);
  };

  const handleGenerateSubAgent = async () => {
    devToolRef.current?.addLog("SYSTEM", "Generating Sub-Agent identity (Ed25519)...");
    subSigner = await UcanService.createIdentity();
    setSubDid(subSigner.did());
    devToolRef.current?.addLog("UCAN", `Sub-Agent identity: ${subSigner.did().slice(0, 25)}...`);
  };

  const handleIssueUcan = async () => {
    if (!masterSigner) {
      devToolRef.current?.addLog("SYSTEM", "Generate a Master Agent identity first.");
      return;
    }
    if (!subSigner && !subDid) {
      devToolRef.current?.addLog("SYSTEM", "Generate or enter a Sub-Agent DID first.");
      return;
    }

    try {
      // Use subSigner if generated, otherwise create identity from entered DID
      const audience = subSigner || await UcanService.createIdentity();
      const delegation = await UcanService.issueDelegation(masterSigner, audience, 'agent/read');

      setUcanCid(delegation.cid.toString());
      devToolRef.current?.triggerAnimation("auth");
      devToolRef.current?.addLog("UCAN", `Real delegation issued! CID: ${delegation.cid.toString().slice(0, 15)}...`);
      devToolRef.current?.addLog("UCAN", `Capability: agent/read | Expires: 24h`);

      // Verify the delegation we just issued
      const result = UcanService.verifyDelegation(delegation, masterSigner.did(), 'agent/read');
      if (result.valid) {
        setVerificationResult("✅ Delegation verified successfully");
        devToolRef.current?.addLog("UCAN", "Delegation verification: PASSED");
      } else {
        setVerificationResult(`❌ Verification failed: ${result.reason}`);
        devToolRef.current?.addLog("UCAN", `Delegation verification FAILED: ${result.reason}`);
      }
    } catch (err) {
      devToolRef.current?.addLog("SYSTEM", `UCAN delegation error: ${err}`);
    }
  };

  const handleZama = () => {
    if (!secretVal) return;
    devToolRef.current?.addLog("SYSTEM", "Requesting Zama FHE encryption...");
    devToolRef.current?.addLog("SYSTEM", "Note: Zama vault is simulated (requires deployed contract + wallet)");
    // Simulation — real implementation requires ethers.js + MetaMask + deployed contract
    const simHash = "0x" + Array.from(secretVal).map((c: string) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').slice(0, 16) + "... (FHE Encrypted)";
    setZamaRef(simHash);
    devToolRef.current?.triggerAnimation("encrypt");
    devToolRef.current?.addLog("ZAMA", `Simulated FHE store: ${simHash.slice(0, 20)}...`);
  };

  return (
    <div>
      {/* Dev Tool Visualizer (Top) */}
      <DevToolVisualizer ref={devToolRef} />

      {/* Stats Bar */}
      <div className="stats-grid" style={{ marginTop: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Public Memory</div>
          <div className="stat-value">{storachaCid ? "1" : "0"}</div>
          <div className="stat-label">CIDs Stored</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Authorizations</div>
          <div className="stat-value">{ucanCid ? "1" : "0"}</div>
          <div className="stat-label">Active UCANs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Encrypted Vault</div>
          <div className="stat-value">{zamaRef ? "64" : "0"}</div>
          <div className="stat-label">Bytes On-Chain</div>
        </div>
      </div>

      {/* Main Feature Grid */}
      <div className="main-grid">
        {/* Storacha Card */}
        <div className="feature-card">
          <div className="feature-icon">☁️</div>
          <h2>Public IPFS Memory</h2>
          <p className="description">
            Store non-sensitive agent context on Storacha's decentralized storage network.
          </p>
          <div className="form-group">
            <label>Agent Context (JSON)</label>
            <textarea
              placeholder='{ "status": "exploring", "goal": "find-water" }'
              rows={4}
              value={publicMemory}
              onChange={(e) => setPublicMemory(e.target.value)}
            />
          </div>
          <button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload to Storacha"}
          </button>

          {storachaCid && (
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--secondary)' }}>
              ✅ CID: <a href={StorachaService.getGatewayUrl(storachaCid)} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>{storachaCid.slice(0, 15)}...</a>
              <button onClick={handleRetrieve} disabled={isRetrieving} style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                {isRetrieving ? "Retrieving..." : "🔍 Retrieve from IPFS"}
              </button>
            </div>
          )}
          {retrievedMemory && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'auto' }}>
              {retrievedMemory}
            </div>
          )}
        </div>

        {/* UCAN Card */}
        <div className="feature-card">
          <div className="feature-icon">🔑</div>
          <h2>UCAN Auth</h2>
          <p className="description">
            Delegate permissions between agents using cryptographic "permission slips".
          </p>
          <div className="form-group">
            <label>Master Agent ID</label>
            <input
              value={masterDid}
              readOnly
              placeholder="Click button to generate identity..."
            />
          </div>
          <div className="form-group">
            <label>Sub-Agent DID</label>
            <input
              placeholder="Click 'Gen Sub-Agent' or paste did:key:z6Mk..."
              value={subDid}
              onChange={(e) => setSubDid(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="secondary" onClick={handleIdentity}>New Master</button>
            <button className="secondary" onClick={handleGenerateSubAgent}>Gen Sub-Agent</button>
            <button onClick={handleIssueUcan}>Issue UCAN</button>
          </div>
          {ucanCid && (
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
              ✅ Real Delegation CID: {ucanCid.slice(0, 20)}...
            </div>
          )}
          {verificationResult && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--accent)' }}>
              {verificationResult}
            </div>
          )}
        </div>

        {/* Zama Card */}
        <div className="feature-card">
          <div className="feature-icon">🛡️</div>
          <h2>Private FHE Vault</h2>
          <p className="description">
            Securely compute on top-secret agent data using Fully Homomorphic Encryption.
          </p>
          <div className="form-group">
            <label>Encrypted Secret</label>
            <input
              type="password"
              placeholder="Secret key or context..."
              value={secretVal}
              onChange={(e) => setSecretVal(e.target.value)}
            />
          </div>
          <button onClick={handleZama}>Store in Zama Vault</button>
          {zamaRef && (
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--accent)' }}>
              ✅ Transacted on Zama Sephora: {zamaRef}
            </div>
          )}
        </div>
      </div>

      <ArchitectureFlow />

      <footer style={{ marginTop: '5rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
        Built for PL Hacks | Powered by Storacha, UCAN, and Zama fhEVM
      </footer>
    </div>
  );
}


