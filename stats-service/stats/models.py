"""
Django ORM models mapped onto the tables created by the Sequelize migrations.
managed = False -> Django never creates/alters these tables (single schema owner).
The password column is intentionally not mapped.
"""
from django.db import models


class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.CharField(max_length=150, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "users"


class LostObject(models.Model):
    STATUS_CHOICES = [("lost", "Lost"), ("found", "Found")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column="user_id", related_name="objects_reported")
    name = models.CharField(max_length=150)
    description = models.TextField()
    image = models.CharField(max_length=255, null=True, blank=True)
    location = models.CharField(max_length=200)
    category = models.CharField(max_length=80, default="Other")
    date = models.DateField()
    status = models.CharField(max_length=5, choices=STATUS_CHOICES, default="lost")
    contact_email = models.CharField(max_length=150, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "objects"


class Message(models.Model):
    lost_object = models.ForeignKey(LostObject, on_delete=models.CASCADE, db_column="object_id", related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, db_column="sender_id", related_name="sent_messages")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, db_column="receiver_id", related_name="received_messages")
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "messages"
