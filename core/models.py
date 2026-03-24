"""
Django models — D2 (Session), D3 (VerificationLog), D4 (SystemConfig).
"""
import uuid
from django.db import models


class SystemConfig(models.Model):
    """D4 — System Mode Config. Single key-value record."""
    key = models.CharField(max_length=50, unique=True)
    value = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.key} = {self.value}"

    class Meta:
        verbose_name = "System Config"
        verbose_name_plural = "System Configs"


class Session(models.Model):
    """D2 — Exam Session store."""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('closed', 'Closed'),
    ]

    session_key = models.CharField(max_length=100, unique=True, db_index=True)
    course_code = models.CharField(max_length=20)
    course_name = models.CharField(max_length=200)
    hall = models.CharField(max_length=100)
    invigilator_name = models.CharField(max_length=150)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.course_code} — {self.hall} ({self.status})"

    @staticmethod
    def generate_session_key(course_code, hall):
        """Generate a unique session key like EXAM-CS301-HALLB-a1b2c3."""
        short_uuid = uuid.uuid4().hex[:6]
        return f"EXAM-{course_code}-{hall}-{short_uuid}".upper().replace(' ', '')

    class Meta:
        ordering = ['-created_at']


class VerificationLog(models.Model):
    """D3 — Permanent audit trail of every verification event."""
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='verifications')
    student_id = models.CharField(max_length=20)
    student_name = models.CharField(max_length=200)
    programme = models.CharField(max_length=200)
    level = models.CharField(max_length=10)
    verified_at = models.DateTimeField(auto_now_add=True)
    invigilator_name = models.CharField(max_length=150)

    def __str__(self):
        return f"{self.student_name} verified at {self.verified_at}"

    class Meta:
        ordering = ['-verified_at']
