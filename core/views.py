"""
API Views — P1 (Mode Resolution), P2 (Student Fetch), P3 (Session Validation),
P8 (Session Management), P9 (Mode Admin).
"""
import json
from pathlib import Path
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Session, VerificationLog, SystemConfig
from .serializers import (
    SystemConfigSerializer,
    SessionSerializer,
    SessionCreateSerializer,
    VerificationLogSerializer,
    StudentSerializer,
)

# ─── D1: Load mock student data ──────────────────────────────────────────────
MOCK_DATA_PATH = Path(__file__).resolve().parent / 'data' / 'mock_students.json'

def _load_students():
    with open(MOCK_DATA_PATH, 'r') as f:
        return json.load(f)


# ─── P1 + P9: Mode Resolution & Administration ──────────────────────────────

@api_view(['GET', 'POST'])
def system_mode(request):
    """
    GET  → P1: Returns current system mode (exam / non_exam).
    POST → P9: Sets system mode. Body: { "mode": "exam" | "non_exam" }
    """
    config, _ = SystemConfig.objects.get_or_create(
        key='system_mode', defaults={'value': 'non_exam'}
    )

    if request.method == 'GET':
        return Response({'mode': config.value})

    new_mode = request.data.get('mode')
    if new_mode not in ('exam', 'non_exam'):
        return Response(
            {'error': 'Mode must be "exam" or "non_exam".'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    config.value = new_mode
    config.save()
    return Response({'mode': config.value})


# ─── P2: Student Data Fetch ──────────────────────────────────────────────────

@api_view(['GET'])
def student_detail(request, student_id):
    """
    P2: Fetches a student record from mock D1 data.
    Returns 404 if student_id is not found.
    """
    students = _load_students()
    student = next((s for s in students if s['student_id'] == student_id), None)

    if student is None:
        return Response(
            {'error': 'Unrecognized student ID.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = StudentSerializer(student)
    return Response(serializer.data)


# ─── P8: Session Management ─────────────────────────────────────────────────

@api_view(['POST'])
def session_create(request):
    """
    P8: Creates a new exam session. Returns the generated session_key.
    Body: { course_code, course_name, hall, invigilator_name }
    """
    serializer = SessionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    session_key = Session.generate_session_key(data['course_code'], data['hall'])

    session = Session.objects.create(
        session_key=session_key,
        course_code=data['course_code'],
        course_name=data['course_name'],
        hall=data['hall'],
        invigilator_name=data['invigilator_name'],
    )

    return Response(SessionSerializer(session).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def session_detail(request, session_key):
    """
    P3: Validates and returns session details by session_key.
    Returns 404 if session doesn't exist, 410 if closed.
    """
    try:
        session = Session.objects.get(session_key=session_key)
    except Session.DoesNotExist:
        return Response(
            {'error': 'Session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if session.status == 'closed':
        return Response(
            {'error': 'This exam session has been closed.'},
            status=status.HTTP_410_GONE,
        )

    return Response(SessionSerializer(session).data)


@api_view(['GET'])
def active_session_detail(request):
    """
    Returns the most recently created 'active' session.
    Used for static NFC URLs to resolve session context on-the-fly.
    """
    session = Session.objects.filter(status='active').order_by('-created_at').first()
    if not session:
        return Response(
            {'error': 'No active exam sessions found.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(SessionSerializer(session).data)


@api_view(['POST'])
def session_close(request, session_key):
    """
    P8: Closes an active session.
    """
    try:
        session = Session.objects.get(session_key=session_key)
    except Session.DoesNotExist:
        return Response(
            {'error': 'Session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if session.status == 'closed':
        return Response(
            {'error': 'Session is already closed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    session.status = 'closed'
    session.closed_at = timezone.now()
    session.save()
    return Response(SessionSerializer(session).data)


@api_view(['GET'])
def session_list(request):
    """
    Returns all sessions (for dashboard history).
    """
    sessions = Session.objects.all()
    return Response(SessionSerializer(sessions, many=True).data)


# ─── Verification Log (read-only for reporting) ─────────────────────────────

@api_view(['GET'])
def session_verifications(request, session_key):
    """
    Returns all verification logs for a given session.
    """
    try:
        session = Session.objects.get(session_key=session_key)
    except Session.DoesNotExist:
        return Response(
            {'error': 'Session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    logs = VerificationLog.objects.filter(session=session)
    return Response(VerificationLogSerializer(logs, many=True).data)
