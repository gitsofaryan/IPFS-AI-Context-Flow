import { expect } from "chai";
import { UcanService } from "../src/lib/ucan.js";

describe("Production Library Integration", function () {
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
});
