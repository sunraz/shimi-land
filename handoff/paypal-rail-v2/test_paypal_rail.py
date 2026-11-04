"""End-to-end proof without live credentials: a mock PayPal that behaves like the API."""
import json, sys
from paypal_rail import PayPalRail, Transport

class MockPayPal(Transport):
    def __init__(self):
        self.orders, self.calls = {}, []
    def post(self, url, data, headers):
        self.calls.append(("POST", url))
        if url.endswith("/v1/oauth2/token"):
            return {"access_token": "mock-token", "expires_in": 32000}
        if url.endswith("/v2/checkout/orders"):
            oid = "ORD-" + str(len(self.orders) + 1).zfill(4)
            self.orders[oid] = data
            return {"id": oid, "status": "CREATED",
                    "links": [{"rel": "approve", "href": f"https://sandbox.paypal.com/checkoutnow?token={oid}"}]}
        raise AssertionError("unexpected " + url)
    def get(self, url, headers): return {}

def run():
    t = MockPayPal(); rail = PayPalRail("cid", "secret", transport=t)
    results = []

    # 1. agent closes a deal
    o = rail.create_order("agent-sales", "Dana", "Canon shoot", 149.90)
    results.append(("agent issues checkout", o["approve_url"].startswith("https://sandbox.paypal.com"), o["order_id"]))

    # 2. agent claims paid BEFORE any webhook -> must be rejected
    claim = rail.claim_paid(o["order_id"])
    results.append(("premature claim rejected", claim["verified"] is False and claim["reason"] == "awaiting_webhook_evidence", claim["status"]))

    # 3. approval webhook
    r1 = rail.handle_webhook(json.dumps({"id": "EV-1", "event_type": "CHECKOUT.ORDER.APPROVED",
                                         "resource": {"id": o["order_id"]}}), {})
    results.append(("approval recorded, not yet paid", r1["applied"] and rail.records[o["order_id"]].status == "approved", r1["record"]["status"]))

    # 4. capture completed -> the only real evidence
    r2 = rail.handle_webhook(json.dumps({"id": "EV-2", "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-1", "supplementary_data": {"related_ids": {"order_id": o["order_id"]}}}}), {})
    results.append(("capture flips business object", r2.get("business_object") == "flipped_to_paid", r2.get("business_object")))

    # 5. idempotency: same event replayed
    r3 = rail.handle_webhook(json.dumps({"id": "EV-2", "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-1", "supplementary_data": {"related_ids": {"order_id": o["order_id"]}}}}), {})
    results.append(("replay ignored (no double commission)", r3["applied"] is False and len(rail.commissions) == 1, r3.get("reason")))

    # 6. commission ledger
    c = rail.commissions[0]
    results.append(("commission ledger correct", abs(c["amount"] - round(149.90*0.12, 2)) < 0.01, f"{c['amount']} {c['currency']} → {c['agent_id']}"))

    # 7. after verification the claim is accepted
    claim2 = rail.claim_paid(o["order_id"])
    results.append(("verified claim accepted", claim2["verified"] is True, claim2["status"]))

    # 8. unknown order webhook cannot create money
    r4 = rail.handle_webhook(json.dumps({"id": "EV-9", "event_type": "PAYMENT.CAPTURE.COMPLETED",
                                         "resource": {"id": "X", "supplementary_data": {"related_ids": {"order_id": "ORD-NOPE"}}}}), {})
    results.append(("unknown order rejected", r4["applied"] is False, r4.get("reason")))

    ok = True
    for name, passed, detail in results:
        print(f"{'PASS' if passed else 'FAIL'}  {name:<44} {detail}")
        ok = ok and passed
    print("\nALL TESTS PASSED" if ok else "\nFAILURES PRESENT")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(run())
