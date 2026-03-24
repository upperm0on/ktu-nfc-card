"""
DRF Serializers for Session, VerificationLog, SystemConfig, and mock Student data.
"""
from rest_framework import serializers
from .models import Session, VerificationLog, SystemConfig


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfig
        fields = ['key', 'value']


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = [
            'id', 'session_key', 'course_code', 'course_name',
            'hall', 'invigilator_name', 'status', 'created_at', 'closed_at',
        ]
        read_only_fields = ['id', 'session_key', 'status', 'created_at', 'closed_at']


class SessionCreateSerializer(serializers.Serializer):
    """Used to create a new exam session."""
    course_code = serializers.CharField(max_length=20)
    course_name = serializers.CharField(max_length=200)
    hall = serializers.CharField(max_length=100)
    invigilator_name = serializers.CharField(max_length=150)


class VerificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationLog
        fields = [
            'id', 'session', 'student_id', 'student_name',
            'programme', 'level', 'verified_at', 'invigilator_name',
        ]
        read_only_fields = ['id', 'verified_at']


class StudentSerializer(serializers.Serializer):
    """Serializes mock student data from JSON."""
    student_id = serializers.CharField()
    full_name = serializers.CharField()
    photo_url = serializers.CharField(allow_blank=True)
    programme = serializers.CharField()
    department = serializers.CharField()
    level = serializers.CharField()
    academic_year = serializers.CharField()
    semester = serializers.CharField()
    enrollment_status = serializers.CharField()
