from django.db.models import Count, Q
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer

from .models import LostObject, Message, User


class SummaryView(APIView):
    """Global totals used by the hero section of the React dashboard."""

    @extend_schema(responses=inline_serializer("Summary", {
        "total": serializers.IntegerField(), "lost": serializers.IntegerField(),
        "found": serializers.IntegerField(), "users": serializers.IntegerField(),
    }))
    def get(self, request):
        agg = LostObject.objects.aggregate(
            total=Count("id"),
            lost=Count("id", filter=Q(status="lost")),
            found=Count("id", filter=Q(status="found")),
        )
        agg["users"] = User.objects.count()
        return Response(agg)


class ByCategoryView(APIView):
    """Reports grouped by category with lost/found split."""

    def get(self, request):
        rows = (
            LostObject.objects.values("category")
            .annotate(
                total=Count("id"),
                lost=Count("id", filter=Q(status="lost")),
                found=Count("id", filter=Q(status="found")),
            )
            .order_by("-total", "category")
        )
        return Response({"data": list(rows)})


class TopLocationsView(APIView):
    def get(self, request):
        rows = LostObject.objects.values("location").annotate(total=Count("id")).order_by("-total", "location")[:10]
        return Response({"data": list(rows)})


class TimelineView(APIView):
    """Reports per day (by the date the object was lost/found)."""

    @extend_schema(parameters=[OpenApiParameter("days", int, description="1-365, default 30")])
    def get(self, request):
        raw = request.query_params.get("days", "30")
        if not raw.isdigit() or not 1 <= int(raw) <= 365:
            raise ValidationError({"days": "Must be an integer between 1 and 365"})
        from datetime import date, timedelta

        since = date.today() - timedelta(days=int(raw) - 1)
        rows = (
            LostObject.objects.filter(date__gte=since)
            .values("date")
            .annotate(total=Count("id"), lost=Count("id", filter=Q(status="lost")), found=Count("id", filter=Q(status="found")))
            .order_by("date")
        )
        return Response({"since": since.isoformat(), "data": [{**r, "date": r["date"].isoformat()} for r in rows]})


class MeView(APIView):
    """Personal statistics. Requires the JWT access token issued by the Express OAuth server."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        uid = request.user.id
        mine = LostObject.objects.filter(user_id=uid).aggregate(
            reported=Count("id"),
            lost=Count("id", filter=Q(status="lost")),
            found=Count("id", filter=Q(status="found")),
        )
        inbox = Message.objects.filter(receiver_id=uid).aggregate(
            received=Count("id"), unread=Count("id", filter=Q(is_read=False))
        )
        sent = Message.objects.filter(sender_id=uid).count()
        return Response({"user_id": uid, "objects": mine, "messages": {**inbox, "sent": sent}})
