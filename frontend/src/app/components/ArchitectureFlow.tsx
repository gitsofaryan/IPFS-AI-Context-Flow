export default function ArchitectureFlow() {
    return (
        <section className="flow-section">
            <h2 style={{ marginBottom: '0.5rem' }}>BEHIND THE SCENES</h2>
            <p className="description">How the Web3 infrastructure layers interact</p>

            <div className="flow-container">
                <div className="flow-node">
                    <div className="flow-label">Step 1</div>
                    <h3>AI Agent</h3>
                    <p>Local creation of context and encrypted state.</p>
                </div>

                <div className="flow-arrow"></div>

                <div className="flow-node">
                    <div className="flow-label">Decentralized Storage</div>
                    <h3>Storacha IPFS</h3>
                    <p>Public memory storage via content-addressed CIDs.</p>
                </div>

                <div className="flow-arrow"></div>

                <div className="flow-node">
                    <div className="flow-label">Authorization</div>
                    <h3>UCAN Service</h3>
                    <p>DID-based permission slips for agent delegation.</p>
                </div>

                <div className="flow-arrow"></div>

                <div className="flow-node">
                    <div className="flow-label">Encrypted Compute</div>
                    <h3>Zama FHE</h3>
                    <p>Confidential state verification on-chain.</p>
                </div>
            </div>
        </section>
    );
}
