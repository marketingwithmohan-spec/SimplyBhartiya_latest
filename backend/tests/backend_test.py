"""
Simply Bhartiya Backend E2E Tests
Covers: auth, batch CRUD + role-based filtering, stage state machine,
QR generation, public trace, analytics, Excel export.
"""
import os
import re
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: try reading frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"

ADMIN = {"username": "Admin", "password": "Administrator@321"}
STAFF = {"username": "Staff", "password": "SimplyBhartiya@321"}

# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def staff_token():
    r = requests.post(f"{API}/auth/login", json=STAFF, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def admin_h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def created_batch(admin_token):
    payload = {
        "vendor_name": "TEST_Vendor_Ramesh",
        "area_pin": "560001",
        "seed_type": "Black Mustard",
        "price_per_kg": 120.5,
        "number_of_bags": 10,
        "size_per_bag": 25,
    }
    r = requests.post(f"{API}/batches", json=payload, headers=admin_h(admin_token), timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- AUTH ----------
class TestAuth:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=20)
        assert r.status_code == 200
        j = r.json()
        assert j["role"] == "admin"
        assert j["username"] == "Admin"
        assert isinstance(j["token"], str) and len(j["token"]) > 20

    def test_staff_login(self):
        r = requests.post(f"{API}/auth/login", json=STAFF, timeout=20)
        assert r.status_code == 200
        j = r.json()
        assert j["role"] == "staff"

    def test_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"username": "Admin", "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_me_with_token(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_missing_token(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code in (401, 403)


# ---------- BATCH CREATE ----------
class TestBatchCreate:
    def test_admin_creates_batch(self, created_batch):
        b = created_batch
        assert "_id" not in b
        assert b["stage"] == 1
        # batch_id format: BM + 14-digit TS + - + pin
        assert re.match(r"^BM\d{14}-560001$", b["batch_id"]), f"got {b['batch_id']}"
        # calculations
        assert b["total_quantity_kg"] == 10 * 25
        assert b["total_amount"] == 10 * 25 * 120.5
        # admin fields visible
        for k in ("vendor_name", "price_per_kg", "total_amount"):
            assert k in b

    def test_staff_cannot_create_batch(self, staff_token):
        payload = {
            "vendor_name": "TEST_VendorX",
            "area_pin": "110001",
            "seed_type": "Coconut",
            "price_per_kg": 200,
            "number_of_bags": 5,
            "size_per_bag": 10,
        }
        r = requests.post(f"{API}/batches", json=payload, headers=admin_h(staff_token), timeout=20)
        assert r.status_code == 403

    def test_invalid_seed_type(self, admin_token):
        payload = {
            "vendor_name": "X", "area_pin": "111111", "seed_type": "Invalid",
            "price_per_kg": 1, "number_of_bags": 1, "size_per_bag": 1,
        }
        r = requests.post(f"{API}/batches", json=payload, headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 400

    def test_all_seed_prefixes(self, admin_token):
        prefix_map = {"Black Mustard": "BM", "White Sesame": "WS", "Groundnut": "GN",
                      "Coconut": "CO", "Almond": "AL"}
        for seed, pfx in prefix_map.items():
            payload = {
                "vendor_name": f"TEST_{pfx}", "area_pin": "400001", "seed_type": seed,
                "price_per_kg": 100, "number_of_bags": 2, "size_per_bag": 5,
            }
            r = requests.post(f"{API}/batches", json=payload, headers=admin_h(admin_token), timeout=20)
            assert r.status_code == 200, r.text
            assert r.json()["batch_id"].startswith(pfx)


# ---------- ROLE-BASED FILTERING (CRITICAL) ----------
class TestRoleFiltering:
    def test_admin_sees_all_fields(self, admin_token, created_batch):
        r = requests.get(f"{API}/batches", headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        b = data[0]
        assert "_id" not in b
        # pick the test batch we created
        target = next((x for x in data if x["batch_id"] == created_batch["batch_id"]), None)
        assert target is not None
        for k in ("vendor_name", "price_per_kg", "total_amount"):
            assert k in target

    def test_staff_list_strips_sensitive(self, staff_token, created_batch):
        r = requests.get(f"{API}/batches", headers=admin_h(staff_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        for b in data:
            assert "_id" not in b
            assert "vendor_name" not in b
            assert "price_per_kg" not in b
            assert "total_amount" not in b

    def test_staff_detail_strips_sensitive(self, staff_token, created_batch):
        r = requests.get(f"{API}/batches/{created_batch['batch_id']}",
                         headers=admin_h(staff_token), timeout=20)
        assert r.status_code == 200
        b = r.json()
        assert "vendor_name" not in b
        assert "price_per_kg" not in b
        assert "total_amount" not in b
        # but operational fields visible
        assert b["batch_id"] == created_batch["batch_id"]
        assert "seed_type" in b
        assert "area_pin" in b

    def test_admin_detail_has_all(self, admin_token, created_batch):
        r = requests.get(f"{API}/batches/{created_batch['batch_id']}",
                         headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        b = r.json()
        assert b["vendor_name"] == "TEST_Vendor_Ramesh"
        assert b["price_per_kg"] == 120.5

    def test_batch_not_found(self, admin_token):
        r = requests.get(f"{API}/batches/NONEXISTENT", headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 404


# ---------- STAGE STATE MACHINE ----------
class TestStageMachine:
    @pytest.fixture(scope="class")
    def stage_batch(self, admin_token):
        payload = {
            "vendor_name": "TEST_StageVendor", "area_pin": "400002",
            "seed_type": "Groundnut", "price_per_kg": 150,
            "number_of_bags": 4, "size_per_bag": 20,
        }
        r = requests.post(f"{API}/batches", json=payload, headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        return r.json()

    def test_cannot_skip_stage2(self, admin_token, stage_batch):
        r = requests.patch(f"{API}/batches/{stage_batch['batch_id']}/stage3",
                           json={"worker_name": "W1", "packaging_capacity": "500ml"},
                           headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 400

    def test_stage2_update(self, admin_token, stage_batch):
        r = requests.patch(f"{API}/batches/{stage_batch['batch_id']}/stage2",
                           json={"machine_number": "M-42", "worker_name": "Suresh"},
                           headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        b = r.json()
        assert b["stage"] == 2
        assert b["stage2"]["machine_number"] == "M-42"
        assert b["stage2"]["worker_name"] == "Suresh"
        assert b["stage2"]["extraction_date"]

    def test_stage2_cannot_repeat(self, admin_token, stage_batch):
        r = requests.patch(f"{API}/batches/{stage_batch['batch_id']}/stage2",
                           json={"machine_number": "M-99", "worker_name": "X"},
                           headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 400

    def test_stage3_update(self, admin_token, stage_batch):
        r = requests.patch(f"{API}/batches/{stage_batch['batch_id']}/stage3",
                           json={"worker_name": "Ravi", "packaging_capacity": "1L"},
                           headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        b = r.json()
        assert b["stage"] == 3
        assert b["stage3"]["packaging_capacity"] == "1L"

    def test_stage3_cannot_repeat(self, admin_token, stage_batch):
        r = requests.patch(f"{API}/batches/{stage_batch['batch_id']}/stage3",
                           json={"worker_name": "Y", "packaging_capacity": "250ml"},
                           headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 400

    def test_staff_can_update_stages(self, staff_token, admin_token):
        # Create a batch as admin, then staff updates stage 2
        payload = {"vendor_name": "TEST_Staff", "area_pin": "500001",
                   "seed_type": "White Sesame", "price_per_kg": 90,
                   "number_of_bags": 2, "size_per_bag": 10}
        cr = requests.post(f"{API}/batches", json=payload, headers=admin_h(admin_token), timeout=20)
        assert cr.status_code == 200
        bid = cr.json()["batch_id"]
        r = requests.patch(f"{API}/batches/{bid}/stage2",
                           json={"machine_number": "M-1", "worker_name": "StaffWorker"},
                           headers=admin_h(staff_token), timeout=20)
        assert r.status_code == 200
        # ensure staff response doesn't leak price
        assert "price_per_kg" not in r.json()


# ---------- QR CODES ----------
class TestQR:
    def test_qr_stage1(self, admin_token, created_batch):
        r = requests.get(f"{API}/batches/{created_batch['batch_id']}/qr/1",
                         headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_qr_stage2(self, admin_token, created_batch):
        r = requests.get(f"{API}/batches/{created_batch['batch_id']}/qr/2",
                         headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"

    def test_qr_stage3(self, admin_token, created_batch):
        r = requests.get(f"{API}/batches/{created_batch['batch_id']}/qr/3",
                         headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/png"

    def test_qr_invalid_stage(self, admin_token, created_batch):
        r = requests.get(f"{API}/batches/{created_batch['batch_id']}/qr/5",
                         headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 400


# ---------- PUBLIC TRACE ----------
class TestPublicTrace:
    def test_trace_no_auth(self, created_batch):
        r = requests.get(f"{API}/trace/{created_batch['batch_id']}", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "_id" not in d
        assert d["batch_id"] == created_batch["batch_id"]
        assert d["seed_type"] == "Black Mustard"
        assert d["origin_pin"] == "560001"
        assert "procurement_date" in d
        assert "current_stage" in d
        # Sensitive fields must NOT be present
        assert "vendor_name" not in d
        assert "price_per_kg" not in d
        assert "total_amount" not in d

    def test_trace_invalid(self):
        r = requests.get(f"{API}/trace/NOPE-123", timeout=20)
        assert r.status_code == 404


# ---------- ANALYTICS ----------
class TestAnalytics:
    def test_admin_week(self, admin_token):
        r = requests.get(f"{API}/analytics?period=week", headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_batches", "total_quantity_kg", "total_revenue",
                  "by_seed_type", "by_stage", "timeline"):
            assert k in d
        assert isinstance(d["timeline"], list)

    def test_admin_month(self, admin_token):
        r = requests.get(f"{API}/analytics?period=month", headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200

    def test_admin_year(self, admin_token):
        r = requests.get(f"{API}/analytics?period=year", headers=admin_h(admin_token), timeout=20)
        assert r.status_code == 200

    def test_staff_forbidden(self, staff_token):
        r = requests.get(f"{API}/analytics?period=week", headers=admin_h(staff_token), timeout=20)
        assert r.status_code == 403


# ---------- EXCEL EXPORT ----------
class TestExcelExport:
    def test_admin_export(self, admin_token):
        r = requests.get(f"{API}/export/excel", headers=admin_h(admin_token), timeout=30)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheetml" in ct or "xlsx" in ct
        # xlsx files start with PK zip magic
        assert r.content[:2] == b"PK"

    def test_staff_forbidden(self, staff_token):
        r = requests.get(f"{API}/export/excel", headers=admin_h(staff_token), timeout=20)
        assert r.status_code == 403
