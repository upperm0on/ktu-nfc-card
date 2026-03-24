"""
Core app URL configuration.
"""
from django.urls import path
from . import views

urlpatterns = [
    # P1 + P9: Mode Resolution & Administration
    path('mode/', views.system_mode, name='system-mode'),

    # P2: Student Data Fetch
    path('student/<str:student_id>/', views.student_detail, name='student-detail'),

    # P8: Session Management
    path('sessions/', views.session_list, name='session-list'),
    path('sessions/active/', views.active_session_detail, name='active-session-detail'),
    path('sessions/create/', views.session_create, name='session-create'),
    path('sessions/<str:session_key>/', views.session_detail, name='session-detail'),
    path('sessions/<str:session_key>/close/', views.session_close, name='session-close'),

    # Verification Logs (read)
    path('sessions/<str:session_key>/verifications/', views.session_verifications, name='session-verifications'),
]
