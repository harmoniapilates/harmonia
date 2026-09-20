"""Wellness booking API tests - Auth, Classes, Bookings, Settings"""
import os
import uuid
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://flow-studio-62.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_CODE = "PROPRIETARIO2026"


def _hdr(token):
    return {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def owner_token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@test.com", "password": "test123"})
    assert r.status_code == 200, f"owner login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def client_token():
    r = requests.post(f"{API}/auth/login", json={"email": "cliente@test.com", "password": "test123"})
    assert r.status_code == 200, f"client login failed: {r.text}"
    return r.json()["access_token"]


# ============ Auth Tests ============
class TestAuth:
    def test_register_client(self):
        email = f"TEST_client_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "test123", "name": "Test Client"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "client"
        assert "access_token" in data

    def test_register_owner_with_code(self):
        email = f"TEST_owner_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "test123", "name": "Test Owner", "admin_code": ADMIN_CODE
        })
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "owner"

    def test_register_owner_bad_code(self):
        email = f"TEST_bad_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "test123", "name": "Bad", "admin_code": "WRONG"
        })
        assert r.status_code == 403

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={"email": "cliente@test.com", "password": "x", "name": "Dup"})
        assert r.status_code == 400

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": "cliente@test.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, client_token):
        r = requests.get(f"{API}/auth/me", headers=_hdr(client_token))
        assert r.status_code == 200
        assert r.json()["email"] == "cliente@test.com"
        assert r.json()["role"] == "client"

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)


# ============ Settings Tests ============
class TestSettings:
    def test_get_settings_client(self, client_token):
        r = requests.get(f"{API}/settings", headers=_hdr(client_token))
        assert r.status_code == 200
        d = r.json()
        assert "business_name" in d
        assert "allow_multiple_bookings" in d

    def test_update_settings_owner(self, owner_token):
        current = requests.get(f"{API}/settings", headers=_hdr(owner_token)).json()
        payload = {
            "business_name": current["business_name"],
            "allow_multiple_bookings": True,
            "cancellation_window_hours": 2,
            "private_requires_confirmation": True,
        }
        r = requests.put(f"{API}/settings", json=payload, headers=_hdr(owner_token))
        assert r.status_code == 200
        assert r.json()["cancellation_window_hours"] == 2

    def test_update_settings_client_forbidden(self, client_token):
        r = requests.put(f"{API}/settings", json={
            "business_name": "Hack", "allow_multiple_bookings": True,
            "cancellation_window_hours": 2, "private_requires_confirmation": True
        }, headers=_hdr(client_token))
        assert r.status_code == 403


# ============ Class Tests ============
class TestClasses:
    def test_list_classes(self, client_token):
        r = requests.get(f"{API}/classes", headers=_hdr(client_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_class_client_forbidden(self, client_token):
        starts = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        r = requests.post(f"{API}/classes", json={
            "title": "Hack", "category": "yoga", "kind": "group", "starts_at": starts
        }, headers=_hdr(client_token))
        assert r.status_code == 403

    def test_create_update_delete_class(self, owner_token):
        starts = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        payload = {
            "title": "TEST_Yoga", "description": "test", "category": "yoga", "kind": "group",
            "starts_at": starts, "duration_minutes": 60, "capacity": 5, "instructor": "T"
        }
        r = requests.post(f"{API}/classes", json=payload, headers=_hdr(owner_token))
        assert r.status_code == 200, r.text
        cls_id = r.json()["id"]
        assert r.json()["title"] == "TEST_Yoga"

        # Verify via GET
        lst = requests.get(f"{API}/classes", headers=_hdr(owner_token)).json()
        assert any(c["id"] == cls_id for c in lst)

        # Update
        r = requests.put(f"{API}/classes/{cls_id}", json={"title": "TEST_Yoga_Updated"}, headers=_hdr(owner_token))
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_Yoga_Updated"

        # Delete
        r = requests.delete(f"{API}/classes/{cls_id}", headers=_hdr(owner_token))
        assert r.status_code == 200


# ============ Booking Tests ============
class TestBookings:
    @pytest.fixture(scope="class")
    def test_class_id(self, owner_token):
        starts = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
        r = requests.post(f"{API}/classes", json={
            "title": "TEST_Booking_Class", "category": "pilates", "kind": "group",
            "starts_at": starts, "duration_minutes": 60, "capacity": 2, "instructor": "T"
        }, headers=_hdr(owner_token))
        assert r.status_code == 200
        cls_id = r.json()["id"]
        yield cls_id
        requests.delete(f"{API}/classes/{cls_id}", headers=_hdr(owner_token))

    def test_create_booking(self, client_token, test_class_id):
        r = requests.post(f"{API}/bookings", json={"class_id": test_class_id}, headers=_hdr(client_token))
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["status"] == "confirmed"
        assert b["class_id"] == test_class_id

    def test_duplicate_booking(self, client_token, test_class_id):
        r = requests.post(f"{API}/bookings", json={"class_id": test_class_id}, headers=_hdr(client_token))
        assert r.status_code == 400
        assert "già prenotato" in r.json()["detail"].lower() or "prenotato" in r.json()["detail"].lower()

    def test_my_bookings(self, client_token, test_class_id):
        r = requests.get(f"{API}/bookings/mine", headers=_hdr(client_token))
        assert r.status_code == 200
        assert any(b["class_id"] == test_class_id for b in r.json())

    def test_all_bookings_owner(self, owner_token):
        r = requests.get(f"{API}/bookings", headers=_hdr(owner_token))
        assert r.status_code == 200

    def test_all_bookings_client_forbidden(self, client_token):
        r = requests.get(f"{API}/bookings", headers=_hdr(client_token))
        assert r.status_code == 403

    def test_class_bookings_owner(self, owner_token, test_class_id):
        r = requests.get(f"{API}/classes/{test_class_id}/bookings", headers=_hdr(owner_token))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_private_pending(self, owner_token, client_token):
        # Ensure settings has private_requires_confirmation=True
        requests.put(f"{API}/settings", json={
            "business_name": "Wellness", "allow_multiple_bookings": True,
            "cancellation_window_hours": 2, "private_requires_confirmation": True
        }, headers=_hdr(owner_token))
        starts = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
        cls = requests.post(f"{API}/classes", json={
            "title": "TEST_Private", "category": "massage", "kind": "private",
            "starts_at": starts, "duration_minutes": 60, "capacity": 2
        }, headers=_hdr(owner_token)).json()
        r = requests.post(f"{API}/bookings", json={"class_id": cls["id"]}, headers=_hdr(client_token))
        assert r.status_code == 200
        assert r.json()["status"] == "pending"
        bid = r.json()["id"]
        # Confirm
        r = requests.post(f"{API}/bookings/{bid}/confirm", headers=_hdr(owner_token))
        assert r.status_code == 200
        # Attend
        r = requests.post(f"{API}/bookings/{bid}/attend", headers=_hdr(owner_token))
        assert r.status_code == 200
        # cleanup
        requests.delete(f"{API}/classes/{cls['id']}", headers=_hdr(owner_token))

    def test_cancellation_window(self, owner_token, client_token):
        # Class in 1 hour -> within default 2h window
        starts = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        cls = requests.post(f"{API}/classes", json={
            "title": "TEST_Soon", "category": "yoga", "kind": "group",
            "starts_at": starts, "duration_minutes": 60, "capacity": 5
        }, headers=_hdr(owner_token)).json()
        b = requests.post(f"{API}/bookings", json={"class_id": cls["id"]}, headers=_hdr(client_token)).json()
        bid = b["id"]
        # Client cannot cancel
        r = requests.delete(f"{API}/bookings/{bid}", headers=_hdr(client_token))
        assert r.status_code == 400, r.text
        # Owner CAN cancel
        r = requests.delete(f"{API}/bookings/{bid}", headers=_hdr(owner_token))
        assert r.status_code == 200
        # cleanup
        requests.delete(f"{API}/classes/{cls['id']}", headers=_hdr(owner_token))

    def test_capacity_full(self, owner_token, client_token):
        starts = (datetime.now(timezone.utc) + timedelta(days=25)).isoformat()
        cls = requests.post(f"{API}/classes", json={
            "title": "TEST_Full", "category": "yoga", "kind": "group",
            "starts_at": starts, "duration_minutes": 60, "capacity": 1
        }, headers=_hdr(owner_token)).json()
        # client books
        r = requests.post(f"{API}/bookings", json={"class_id": cls["id"]}, headers=_hdr(client_token))
        assert r.status_code == 200
        # register another user and try
        email = f"TEST_cap_{uuid.uuid4().hex[:6]}@t.com"
        u = requests.post(f"{API}/auth/register", json={"email": email, "password": "test123", "name": "U"}).json()
        r = requests.post(f"{API}/bookings", json={"class_id": cls["id"]}, headers=_hdr(u["access_token"]))
        assert r.status_code == 400
        # cleanup
        requests.delete(f"{API}/classes/{cls['id']}", headers=_hdr(owner_token))

    def test_allow_multiple_bookings_false(self, owner_token):
        # set false
        requests.put(f"{API}/settings", json={
            "business_name": "Wellness", "allow_multiple_bookings": False,
            "cancellation_window_hours": 2, "private_requires_confirmation": True
        }, headers=_hdr(owner_token))
        try:
            # Register a fresh client
            email = f"TEST_multi_{uuid.uuid4().hex[:6]}@t.com"
            u = requests.post(f"{API}/auth/register", json={"email": email, "password": "test123", "name": "U"}).json()
            tok = u["access_token"]
            starts1 = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            starts2 = (datetime.now(timezone.utc) + timedelta(days=31)).isoformat()
            c1 = requests.post(f"{API}/classes", json={
                "title": "TEST_M1", "category": "yoga", "kind": "group",
                "starts_at": starts1, "duration_minutes": 60, "capacity": 5
            }, headers=_hdr(owner_token)).json()
            c2 = requests.post(f"{API}/classes", json={
                "title": "TEST_M2", "category": "yoga", "kind": "group",
                "starts_at": starts2, "duration_minutes": 60, "capacity": 5
            }, headers=_hdr(owner_token)).json()
            r1 = requests.post(f"{API}/bookings", json={"class_id": c1["id"]}, headers=_hdr(tok))
            assert r1.status_code == 200
            r2 = requests.post(f"{API}/bookings", json={"class_id": c2["id"]}, headers=_hdr(tok))
            assert r2.status_code == 400
            # cleanup
            requests.delete(f"{API}/classes/{c1['id']}", headers=_hdr(owner_token))
            requests.delete(f"{API}/classes/{c2['id']}", headers=_hdr(owner_token))
        finally:
            # restore
            requests.put(f"{API}/settings", json={
                "business_name": "Wellness", "allow_multiple_bookings": True,
                "cancellation_window_hours": 2, "private_requires_confirmation": True
            }, headers=_hdr(owner_token))
