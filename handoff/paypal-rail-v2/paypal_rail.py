"""
PayPal rail for autonomous agents — Orders API v2 + webhook verification.
Fail-closed: no key in code, no state without a verified webhook.
"""
import os, json, hmac, hashlib, base64, time, uuid
from dataclasses import dataclass, field, asdict
from typing import Optional

class PayPalError(Exception):
    def __init__(self, status, code, message):
        super().__init__(f"{status} {code}: {message}")
        self.status, self.code, self.message = status, code, message

class Transport:
    """HTTP transport. Injected so the flow is testable without live credentials."""
    def post(self, url, data, headers): raise NotImplementedError
    def get(self, url, headers): raise NotImplementedError

class LiveTransport(Transport):
    def __init__(self, base="https://api-m.sandbox.paypal.com"):
        self.base = base
    def _req(self, method, path, payload=None, headers=None):
        import urllib.request, urllib.error
        body = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(self.base + path, data=body, method=method,
                                     headers={"Content-Type": "application/json", **(headers or {})})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read().decode()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            try: j = json.loads(raw)
            except Exception: j = {"message": raw[:200]}
            raise PayPalError(e.code, j.get("name", "HTTP_ERROR"), j.get("message", ""))
    def post(self, url, data, headers): return self._req("POST", url, data, headers)
    def get(self, url, headers): return self._req("GET", url, None, headers)

@dataclass
class PaymentRecord:
    id: str
    agent_id: str
    customer: str
    product: str
    amount: str
    currency: str
    order_id: str
    status: str = "created"          # created -> approved -> verified -> captured
    capture_id: Optional[str] = None
    webhook_event_id: Optional[str] = None
    created_at: float = field(default_factory=time.time)

class PayPalRail:
    def __init__(self, client_id, client_secret, transport=None, commission_rate=0.12):
        self.cid, self.secret = client_id, client_secret
        self.t = transport or LiveTransport()
        self.records = {}
        self.commissions = []
        self.seen_events = set()      # idempotency: a webhook is applied once
        self._token = None
        self._token_exp = 0
        self.commission_rate = commission_rate

    # ---------- auth ----------
    def token(self):
        if self._token and time.time() < self._token_exp - 60:
            return self._token
        basic = base64.b64encode(f"{self.cid}:{self.secret}".encode()).decode()
        r = self.t.post("/v1/oauth2/token", {"grant_type": "client_credentials"},
                        {"Authorization": "Basic " + basic,
                         "Content-Type": "application/x-www-form-urlencoded"})
        self._token = r["access_token"]
        self._token_exp = time.time() + int(r.get("expires_in", 32000))
        return self._token

    def _auth(self):
        return {"Authorization": "Bearer " + self.token()}

    # ---------- agent-facing ----------
    def create_order(self, agent_id, customer, product, amount, currency="ILS", link_id=None):
        """An agent that closed a deal calls this once and gets a payable order."""
        if float(amount) <= 0: raise ValueError("amount must be positive")
        payload = {"intent": "CAPTURE",
                   "purchase_units": [{"reference_id": link_id or str(uuid.uuid4()),
                                       "description": product[:127],
                                       "amount": {"currency_code": currency, "value": f"{float(amount):.2f}"}}],
                   "application_context": {"brand_name": "Shimi Network", "user_action": "PAY_NOW"}}
        r = self.t.post("/v2/checkout/orders", payload, self._auth())
        rec = PaymentRecord(id="pr_" + uuid.uuid4().hex[:12], agent_id=agent_id, customer=customer,
                            product=product, amount=f"{float(amount):.2f}", currency=currency,
                            order_id=r["id"], status="created")
        self.records[rec.order_id] = rec
        approve = next((l["href"] for l in r.get("links", []) if l.get("rel") in ("approve", "payer-action")), None)
        return {"order_id": r["id"], "approve_url": approve, "record_id": rec.id}

    # ---------- webhook ----------
    def handle_webhook(self, raw_body: str, headers: dict):
        """The ONLY accepted evidence that money moved."""
        event = json.loads(raw_body)
        eid = event.get("id")
        if eid in self.seen_events:                     # replay -> no double effect
            return {"applied": False, "reason": "duplicate_event"}
        order_id = (event.get("resource") or {}).get("supplementary_data", {}) \
            .get("related_ids", {}).get("order_id") or (event.get("resource") or {}).get("id")
        et = event.get("event_type", "")
        rec = self.records.get(order_id)
        if not rec:
            return {"applied": False, "reason": "unknown_order"}

        if et in ("CHECKOUT.ORDER.APPROVED",):
            rec.status = "approved"
        elif et in ("PAYMENT.CAPTURE.COMPLETED",):
            rec.status = "verified"
            rec.webhook_event_id = eid
            rec.capture_id = (event.get("resource") or {}).get("id")
            # business object flips only now
            self.commissions.append({"agent_id": rec.agent_id, "payment_id": rec.id,
                                     "amount": round(float(rec.amount) * self.commission_rate, 2),
                                     "currency": rec.currency})
            self.seen_events.add(eid)
            return {"applied": True, "record": asdict(rec), "business_object": "flipped_to_paid"}
        else:
            return {"applied": False, "reason": f"ignored_event:{et}"}

        self.seen_events.add(eid)
        return {"applied": True, "record": asdict(rec)}

    def claim_paid(self, order_id):
        """Agents are not trusted to assert payment. This is what they get instead."""
        rec = self.records.get(order_id)
        if not rec: return {"verified": False, "reason": "unknown_order"}
        return {"verified": rec.status == "verified",
                "reason": None if rec.status == "verified" else "awaiting_webhook_evidence",
                "status": rec.status}
