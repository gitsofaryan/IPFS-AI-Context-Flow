"use client";

import { useState } from "react";
import { StorachaService } from "@/lib/storacha";
import { UcanService } from "@/lib/ucan";
import ArchitectureFlow from "./components/ArchitectureFlow";

export default function Home() {
  const [publicMemory, setPublicMemory] = useState("");
  const [storachaCid, setStorachaCid] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [masterDid, setMasterDid] = useState("");
  const [subDid, setSubDid] = useState("");
  const [ucanCid, setUcanCid] = useState("");

  const [secretVal, setSecretVal] = useState("");
  const [zamaRef, setZamaRef] = useState("");

  const handleUpload = async () => {
    if (!publicMemory) return;
    setIsUploading(true);
    try {
      // In a real app, this would use the browser-linked Storacha space
      // For this demo, we'll simulate the response based on our library
      const cid = "bafybeigh4mvdjagffgry2kcdykahpibhnvv3pzs5bbgaeu7v5olsxafeyqy";
      setStorachaCid(cid);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleIdentity = async () => {
    const id = await UcanService.createIdentity();
    setMasterDid(id.did());
  };

  const handleZama = () => {
    // Simulate Zama Transaction
    setZamaRef("0x5FbDB2315678... (FHE Encrypted)");
  };

  return (
    <div>
      {/* Stats Bar */}
      <div className="stats-grid">
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
              placeholder="did:key:z6Mk..."
              value={subDid}
              onChange={(e) => setSubDid(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="secondary" onClick={handleIdentity}>New Identity</button>
            <button onClick={() => setUcanCid("bafy...delegation")}>Issue UCAN</button>
          </div>
          {ucanCid && (
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
              ✅ Delegation Token Generated for Sub-Agent.
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

      {/* In-App Visualization */}
      <ArchitectureFlow />

      <footer style={{ marginTop: '5rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
        Built for PL Hacks | Powered by Storacha, UCAN, and Zama fhEVM
      </footer>
    </div>
  );
}

