import { expect } from "chai";
import { UcanService } from "../src/lib/ucan.js";

describe("UCAN Service Integration", function () {
    it("Should generate agent identities and issue delegations", async function () {
        const master = await UcanService.createIdentity();
        const sub = await UcanService.createIdentity();

        console.log("Master DID:", master.did());
        console.log("Sub DID:", sub.did());

        const delegation = await UcanService.issueDelegation(master, sub, 'agent/read');

        expect(delegation.issuer.did()).to.equal(master.did());
        expect(delegation.audience.did()).to.equal(sub.did());
        expect(delegation.capabilities[0].can).to.equal('agent/read');
    });

    it("Should verify a valid delegation", async function () {
        const master = await UcanService.createIdentity();
        const sub = await UcanService.createIdentity();

        const delegation = await UcanService.issueDelegation(master, sub, 'agent/read');

        const result = UcanService.verifyDelegation(delegation, master.did(), 'agent/read');
        expect(result.valid).to.equal(true);
        expect(result.reason).to.equal(undefined);
    });

    it("Should reject a delegation with wrong issuer", async function () {
        const master = await UcanService.createIdentity();
        const sub = await UcanService.createIdentity();
        const imposter = await UcanService.createIdentity();

        const delegation = await UcanService.issueDelegation(master, sub, 'agent/read');

        const result = UcanService.verifyDelegation(delegation, imposter.did(), 'agent/read');
        expect(result.valid).to.equal(false);
        expect(result.reason).to.include("Issuer mismatch");
    });

    it("Should reject a delegation with wrong capability", async function () {
        const master = await UcanService.createIdentity();
        const sub = await UcanService.createIdentity();

        const delegation = await UcanService.issueDelegation(master, sub, 'agent/read');

        const result = UcanService.verifyDelegation(delegation, master.did(), 'agent/write');
        expect(result.valid).to.equal(false);
        expect(result.reason).to.include("Missing capability");
    });

    it("Should reject an expired delegation", async function () {
        const master = await UcanService.createIdentity();
        const sub = await UcanService.createIdentity();

        // Issue with 0 hours = already expired
        const delegation = await UcanService.issueDelegation(master, sub, 'agent/read', 0);

        // Wait a moment to ensure it's truly expired
        await new Promise(r => setTimeout(r, 100));

        const result = UcanService.verifyDelegation(delegation, master.did(), 'agent/read');
        expect(result.valid).to.equal(false);
        expect(result.reason).to.include("expired");
    });

    it("Should support custom expiration hours", async function () {
        const master = await UcanService.createIdentity();
        const sub = await UcanService.createIdentity();

        const delegation = await UcanService.issueDelegation(master, sub, 'agent/read', 1);

        const result = UcanService.verifyDelegation(delegation, master.did(), 'agent/read');
        expect(result.valid).to.equal(true);
    });
});
