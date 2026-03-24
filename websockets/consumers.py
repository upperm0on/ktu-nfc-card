"""
WebSocket Consumer — P7 (Channel Manager) + P5 (Verification Event Emitter).
Each exam session maps to one channel group identified by session_key.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class SessionConsumer(AsyncWebsocketConsumer):
    """
    Handles WebSocket connections for a specific exam session.
    
    Card pages (P4) and Invigilator dashboards (P6) connect to the same
    group using the session_key from the URL route.
    """

    async def connect(self):
        self.session_key = self.scope['url_route']['kwargs']['session_key']
        self.group_name = f'session_{self.session_key}'

        # Join the session channel group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'session_key': self.session_key,
            'message': f'Connected to session {self.session_key}',
        }))

    async def disconnect(self, close_code):
        # Leave the session channel group cleanly
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Receives messages from clients.
        Primary action: verify_student (P5 logic).
        """
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'verify_student':
            await self._handle_verification(data)

    async def _handle_verification(self, data):
        """
        P5: Verification Event Emitter.
        1. Logs the verification to D3.
        2. Broadcasts the event to the session group (reaches P6 dashboard).
        """
        student_id = data.get('student_id', '')
        student_name = data.get('student_name', '')
        programme = data.get('programme', '')
        level = data.get('level', '')
        invigilator_name = data.get('invigilator_name', '')

        # Write to D3 (VerificationLog)
        log_entry = await self._create_verification_log(
            self.session_key, student_id, student_name,
            programme, level, invigilator_name,
        )

        # Broadcast verification event to the entire session group
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'student_verified',
                'id': log_entry.get('id'),
                'student_id': student_id,
                'student_name': student_name,
                'programme': programme,
                'level': level,
                'invigilator_name': invigilator_name,
                'verified_at': log_entry['verified_at'],
            }
        )

    async def student_verified(self, event):
        """
        Handler for the student_verified group event.
        Forwards the verification payload to all connected WebSocket clients.
        """
        await self.send(text_data=json.dumps({
            'type': 'student_verified',
            'log': {
                'id': event.get('id'),
                'student_id': event['student_id'],
                'student_name': event['student_name'],
                'programme': event['programme'],
                'level': event['level'],
                'invigilator_name': event['invigilator_name'],
                'verified_at': event['verified_at'],
            }
        }))

    @database_sync_to_async
    def _create_verification_log(self, session_key, student_id, student_name,
                                  programme, level, invigilator_name):
        """Synchronous DB write wrapped for async context."""
        from core.models import Session, VerificationLog

        try:
            session = Session.objects.get(session_key=session_key)
        except Session.DoesNotExist:
            return {'verified_at': str(timezone.now()), 'error': 'Session not found'}

        log = VerificationLog.objects.create(
            session=session,
            student_id=student_id,
            student_name=student_name,
            programme=programme,
            level=level,
            invigilator_name=invigilator_name,
        )

        return {'verified_at': str(log.verified_at), 'id': log.id}
