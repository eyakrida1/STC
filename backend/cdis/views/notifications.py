"""Notifications de l'utilisateur connecté (api/notifications.ts)."""
from .. import serializers as ser
from .. import timeutil
from ..http import endpoint
from ..models import Notification


@endpoint("GET")
def list_mine(request):
    qs = Notification.objects.filter(user=request.user).select_related("child").order_by("-created_at")
    return [ser.notification(n) for n in qs]


@endpoint("POST")
def mark_read(request, notification_id):
    Notification.objects.filter(pk=notification_id, user=request.user, read_at__isnull=True).update(
        read_at=timeutil.now()
    )
    return None


@endpoint("POST")
def mark_all_read(request):
    Notification.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timeutil.now())
    return None
