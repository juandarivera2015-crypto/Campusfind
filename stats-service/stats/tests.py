import time
from datetime import date

import jwt
from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from .models import LostObject, Message, User


def make_token(sub=1, secret=None, **overrides):
    cfg = settings.JWT
    payload = {"sub": str(sub), "iss": cfg["ISSUER"], "aud": cfg["AUDIENCE"], "exp": int(time.time()) + 300,
               "scope": "profile objects:read", "name": "Alice"}
    payload.update(overrides)
    return jwt.encode(payload, secret or cfg["SECRET"], algorithm="HS256")


class StatsApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice = User.objects.create(name="Alice", email="alice@uni.edu")
        cls.bob = User.objects.create(name="Bob", email="bob@uni.edu")
        today = date.today()
        o1 = LostObject.objects.create(user=cls.alice, name="Keys", description="x", location="Library",
                                       category="Keys", date=today, status="lost")
        LostObject.objects.create(user=cls.alice, name="ID", description="x", location="Library",
                                  category="Documents", date=today, status="found")
        LostObject.objects.create(user=cls.bob, name="Phone", description="x", location="Gym",
                                  category="Electronics", date=today, status="lost")
        Message.objects.create(lost_object=o1, sender=cls.bob, receiver=cls.alice, message="found them?")

    def setUp(self):
        self.client = APIClient()

    def test_summary(self):
        res = self.client.get("/api/stats/summary/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"total": 3, "lost": 2, "found": 1, "users": 2})

    def test_by_category_and_locations(self):
        cats = {r["category"]: r for r in self.client.get("/api/stats/by-category/").json()["data"]}
        self.assertEqual(cats["Keys"]["lost"], 1)
        top = self.client.get("/api/stats/top-locations/").json()["data"]
        self.assertEqual(top[0], {"location": "Library", "total": 2})

    def test_timeline_validates_days(self):
        self.assertEqual(self.client.get("/api/stats/timeline/?days=0").status_code, 400)
        self.assertEqual(self.client.get("/api/stats/timeline/?days=1%27%20OR%201=1").status_code, 400)
        res = self.client.get("/api/stats/timeline/?days=7")
        self.assertEqual(res.json()["data"][0]["total"], 3)

    def test_me_requires_valid_jwt(self):
        self.assertEqual(self.client.get("/api/stats/me/").status_code, 401)
        for bad in (make_token(secret="wrong-secret-wrong-secret-wrong-secret"),
                    make_token(exp=int(time.time()) - 5),
                    make_token(aud="someone-else")):
            self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {bad}")
            self.assertEqual(self.client.get("/api/stats/me/").status_code, 401)

    def test_me_with_valid_jwt(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {make_token(sub=self.alice.id)}")
        res = self.client.get("/api/stats/me/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["objects"], {"reported": 2, "lost": 1, "found": 1})
        self.assertEqual(body["messages"], {"received": 1, "unread": 1, "sent": 0})

    def test_health_and_metrics(self):
        self.assertEqual(self.client.get("/health/live").status_code, 200)
        self.assertIn(b"django_http_requests", self.client.get("/metrics").content)
