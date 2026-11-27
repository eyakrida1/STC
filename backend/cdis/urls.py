"""
Routes de l'API (préfixe /api/). Chaque route correspond à une fonction de frontend/src/api/ (même nom en commentaire).
"""
from django.urls import path

from .views import audit, auth, children, followup, notifications, roadmap, sessions, stats, styleguide

urlpatterns = [
    # auth.ts
    path("auth/csrf", auth.csrf),
    path("auth/login", auth.login),  # login
    path("auth/logout", auth.logout),  # logout
    path("auth/me", auth.me),  # getCurrentUser
    path("me/profile", auth.update_profile),  # updateMyProfile
    path("me/password", auth.change_password),  # changeMyPassword
    path("team", auth.team),  # listTeam
    path("pole", auth.my_pole),  # getMyPole
    path("demo/accounts", auth.demo_accounts),  # listDemoAccounts
    path("demo/reset", auth.demo_reset),  # resetDemo
    # children.ts
    path("children", children.list_children),  # listChildren
    path("children/<str:child_id>", children.get_child),  # getChild
    path("children/<str:child_id>/audit", children.log_block_opened),  # logBlockOpened
    path("children/<str:child_id>/blocks/<str:block>", children.update_block),  # updateChildBlock
    path("children/<str:child_id>/phase", children.set_phase),  # setPhase
    path("children/<str:child_id>/team", children.child_team),  # getChildTeam
    # sessions.ts
    path("children/<str:child_id>/sessions", sessions.list_my_sessions),  # listMySessions
    path("children/<str:child_id>/ai-status", sessions.ai_note_status),  # getAiNoteStatus
    path("children/<str:child_id>/notes/read-all", sessions.mark_all_notes_read),  # markAllNotesRead
    path("sessions", sessions.create_session),  # createSession
    path("sessions/<str:session_id>", sessions.get_my_session),  # getMySession
    path("sessions/<str:session_id>/edit", sessions.update_my_session),  # updateMySession
    path("sessions/<str:session_id>/read", sessions.mark_note_read),  # markNoteRead
    path("notes/received", sessions.list_received_notes),  # listReceivedNotes
    # followup.ts
    path("children/<str:child_id>/attendance", followup.get_attendance),  # getAttendance
    path("attendance", followup.set_attendance),  # setAttendance
    path("children/<str:child_id>/activities", followup.list_activities),  # listActivities
    path("activities", followup.save_activity),  # saveActivity
    path("activities/<str:activity_id>", followup.delete_activity),  # deleteActivity
    path("aid-programs", followup.list_aid_programs),  # listAidPrograms
    path("children/<str:child_id>/aid-applications", followup.list_aid_applications),  # listAidApplications
    path("aid-applications", followup.save_aid_application),  # saveAidApplication
    path("children/<str:child_id>/mood-scales", followup.list_mood_scales),  # listMoodScales
    # roadmap.ts
    path("children/<str:child_id>/roadmap", roadmap.get_roadmap),  # getRoadmap
    path("children/<str:child_id>/roadmap/goal", roadmap.update_goal),  # updateRoadmapGoal
    path("children/<str:child_id>/roadmap/proposals", roadmap.generate),  # generateRoadmapProposal
    path("children/<str:child_id>/roadmap/sources", roadmap.sources),  # getRoadmapSources
    path("children/<str:child_id>/roadmap/parts/<str:key>/validate", roadmap.validate),  # validateRoadmapPart
    path("children/<str:child_id>/roadmap/parts/<str:key>/reject", roadmap.reject),  # rejectRoadmapPart
    path("children/<str:child_id>/roadmap/parts/<str:key>/comments", roadmap.comment),  # commentRoadmapProposal
    # notifications.ts
    path("notifications", notifications.list_mine),  # listMyNotifications
    path("notifications/read-all", notifications.mark_all_read),  # markAllNotificationsRead
    path("notifications/<str:notification_id>/read", notifications.mark_read),  # markNotificationRead
    # audit.ts · stats.ts · styleguide.ts
    path("audit/sensitive-access", audit.sensitive_access),  # listSensitiveAccess
    path("stats/dashboard", stats.dashboard),  # getDashboardStats
    path("styleguide", styleguide.examples),  # getStyleguideExamples
]
