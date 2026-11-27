"""
Tests de l'API : contrat, règles d'accès par rôle (CLAUDE.md), confidentialité des 3 sorties, audit, IA.
Lancer : python manage.py test cdis
"""
import json
from datetime import timedelta

from django.core.exceptions import PermissionDenied
from django.test import Client, TestCase, override_settings

from cdis import timeutil
from cdis.models import AuditEntry, Notification, Session
from cdis.seed import load_demo

FAST_HASH = ["django.contrib.auth.hashers.MD5PasswordHasher"]


def last_weekday_before_today():
    d = timeutil.today() - timedelta(days=1)
    while d.isoweekday() == 7:
        d -= timedelta(days=1)
    return d.isoformat()


@override_settings(PASSWORD_HASHERS=FAST_HASH)
class ApiTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        load_demo()

    def as_user(self, username: str) -> Client:
        c = Client()
        r = c.post("/api/auth/login", {"username": username, "password": "demo"}, content_type="application/json")
        self.assertEqual(r.status_code, 200, r.content)
        return c

    def call(self, client, method, url, data=None, status=200):
        fn = getattr(client, method.lower())
        r = fn(url, json.dumps(data), content_type="application/json") if data is not None else fn(url)
        self.assertEqual(r.status_code, status, f"{method} {url} → {r.status_code} {r.content[:300]!r}")
        return r.json()

    def consultation(self, humeur=4, **extra):
        scales = {"humeur": humeur, "anxiete": 3, "confiance": 3, "colere": 3, "relations": 3, "motivation": 3}
        return {
            "childId": "c-yassine",
            "date": timeutil.today().isoformat(),
            "details": {"kind": "consultation", "durationMin": 45, "type": "suivi", "scales": scales},
            "privateNote": None,
            "sharedNote": None,
            "aiNote": None,
            **extra,
        }

    def observation(self, ai: str, child="c-yassine"):
        return {
            "childId": child,
            "date": timeutil.today().isoformat(),
            "details": {"kind": "observation", "context": "Atelier", "durationMin": 60, "skillsObserved": []},
            "privateNote": None,
            "sharedNote": None,
            "aiNote": ai,
        }


class AuthTests(ApiTestCase):
    def test_login_errors_are_generic(self):
        c = Client()
        r1 = c.post("/api/auth/login", {"username": "psy", "password": "nope"}, content_type="application/json")
        r2 = c.post("/api/auth/login", {"username": "nobody", "password": "demo"}, content_type="application/json")
        self.assertEqual(r1.status_code, 401)
        self.assertEqual(r1.json(), r2.json())

    def test_me_login_logout(self):
        c = Client()
        self.assertIsNone(self.call(c, "GET", "/api/auth/me"))
        self.call(c, "GET", "/api/children", status=401)
        user = self.call(c, "POST", "/api/auth/login", {"username": " PSY ", "password": "demo"})
        self.assertEqual(user["id"], "u-psy")
        self.assertEqual(set(user), {"id", "username", "role", "firstName", "lastName", "birthDate", "phone", "email", "cin", "poleId", "avatarSeed", "photoUrl"})
        self.assertNotIn("password", user)
        self.assertEqual(self.call(c, "GET", "/api/auth/me")["role"], "psychologue")
        self.call(c, "POST", "/api/auth/logout")
        self.assertIsNone(self.call(c, "GET", "/api/auth/me"))

    def test_csrf_is_enforced(self):
        c = Client(enforce_csrf_checks=True)
        r = c.post("/api/auth/login", {"username": "psy", "password": "demo"}, content_type="application/json")
        self.assertEqual(r.status_code, 403)
        c.get("/api/auth/csrf")
        token = c.cookies["csrftoken"].value
        r = c.post("/api/auth/login", {"username": "psy", "password": "demo"}, content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(r.status_code, 200)

    def test_profile_and_password(self):
        c = self.as_user("educateur")
        me = self.call(c, "PUT", "/api/me/profile", {"firstName": " Karim ", "lastName": "M", "birthDate": "1988-04-12", "phone": "20100201", "email": "k@x.tn", "photoUrl": None, "cin": "HACK", "role": "directeur"})
        self.assertEqual((me["firstName"], me["cin"], me["role"]), ("Karim", "08XXXX21", "educateur"))
        self.call(c, "PUT", "/api/me/profile", {"firstName": "K", "lastName": "M", "birthDate": "1988-04-12", "phone": "", "email": "", "photoUrl": "javascript:alert(1)"}, status=400)
        err = self.call(c, "POST", "/api/me/password", {"oldPassword": "bad", "newPassword": "0123456789"}, status=400)
        self.assertEqual(err["message"], "wrong_password")
        self.assertEqual(self.call(c, "POST", "/api/me/password", {"oldPassword": "demo", "newPassword": "short"}, status=400)["message"], "too_short")
        self.call(c, "POST", "/api/me/password", {"oldPassword": "demo", "newPassword": "0123456789"})
        self.assertEqual(self.call(c, "GET", "/api/auth/me")["id"], "u-edu")  # toujours connecté

    def test_team_pole_demo_styleguide(self):
        c = self.as_user("social")
        team = self.call(c, "GET", "/api/team")
        self.assertEqual(len(team), 4)
        self.assertNotIn("cin", team[0])
        self.assertEqual(self.call(c, "GET", "/api/pole")["name"], "CDIS Tunis")
        anon = Client()
        self.assertEqual(len(self.call(anon, "GET", "/api/demo/accounts")), 4)
        self.assertIn("route", self.call(anon, "GET", "/api/styleguide"))

    @override_settings(DEMO_MODE=False)
    def test_demo_endpoints_closed_outside_demo_mode(self):
        anon = Client()
        self.assertEqual(self.call(anon, "GET", "/api/demo/accounts"), [])
        self.call(anon, "POST", "/api/demo/reset", status=403)


class ChildrenTests(ApiTestCase):
    def test_list_children_summaries(self):
        kids = self.call(self.as_user("educateur"), "GET", "/api/children")
        self.assertEqual(len(kids), 6)
        by_id = {k["id"]: k for k in kids}
        self.assertTrue(by_id["c-nour"]["pendingValidation"])  # proposition éducation en attente
        self.assertFalse(by_id["c-hamza"]["pendingValidation"])  # c'est la partie psy
        self.assertGreaterEqual(by_id["c-hamza"]["recentAbsences"], 2)  # absences forcées (hors dimanche)
        self.assertTrue(by_id["c-rania"]["returned"])
        self.assertGreaterEqual(by_id["c-amira"]["unreadNotes"], 2)
        self.assertTrue(self.call(self.as_user("psy"), "GET", "/api/children")[0]["id"])
        self.assertEqual(len(self.call(self.as_user("directeur"), "GET", "/api/children")), 6)

    def test_block_ownership(self):
        edu, soc = self.as_user("educateur"), self.as_user("social")
        child = self.call(edu, "GET", "/api/children/c-yassine")
        self.call(edu, "PUT", "/api/children/c-yassine/blocks/identity", {"value": child["identity"]}, status=403)
        self.call(self.as_user("directeur"), "PUT", "/api/children/c-yassine/blocks/schooling", {"value": child["schooling"]}, status=403)
        identity = {**child["identity"], "address": "Nouvelle adresse"}
        updated = self.call(soc, "PUT", "/api/children/c-yassine/blocks/identity", {"value": identity})
        self.assertEqual(updated["identity"]["address"], "Nouvelle adresse")
        schooling = {**child["schooling"], "actualGrade": 7}
        self.assertEqual(self.call(edu, "PUT", "/api/children/c-yassine/blocks/schooling", {"value": schooling})["schooling"]["actualGrade"], 7)
        self.call(edu, "PUT", "/api/children/c-yassine/blocks/schooling", {"value": {**schooling, "actualGrade": 99}}, status=400)
        self.call(soc, "PUT", "/api/children/c-yassine/blocks/family", {"value": {"father": {}}}, status=400)
        self.call(self.as_user("psy"), "PUT", "/api/children/c-yassine/blocks/mood", {"value": child["mood"]}, status=403)
        self.call(soc, "PUT", "/api/children/c-yassine/blocks/nope", {"value": {}}, status=404)

    def test_journey_edit_cannot_change_phase(self):
        soc = self.as_user("social")
        child = self.call(soc, "GET", "/api/children/c-yassine")
        journey = {**child["journey"], "phase": 5, "referredBy": "juge", "entryDate": "2026-01-02"}
        j = self.call(soc, "PUT", "/api/children/c-yassine/blocks/journey", {"value": journey})["journey"]
        self.assertEqual((j["phase"], j["referredBy"], j["entryDate"], j["stays"][-1]["entryDate"]), (3, "juge", "2026-01-02", "2026-01-02"))

    def test_phase_change(self):
        edu = self.as_user("educateur")
        self.call(edu, "POST", "/api/children/c-yassine/phase", {"phase": 5, "comment": "x"}, status=400)
        self.call(edu, "POST", "/api/children/c-yassine/phase", {"phase": 4, "comment": "  "}, status=400)
        j = self.call(edu, "POST", "/api/children/c-yassine/phase", {"phase": 4, "comment": "Bilan positif"})["journey"]
        self.assertEqual(j["phase"], 4)
        self.assertEqual(j["phaseHistory"][-1]["by"], "u-edu")
        self.call(self.as_user("directeur"), "POST", "/api/children/c-nour/phase", {"phase": 5, "comment": "x"}, status=403)

    def test_team_and_unknown_child(self):
        c = self.as_user("psy")
        self.assertEqual([m["role"] for m in self.call(c, "GET", "/api/children/c-yassine/team")], ["educateur", "psychologue", "social"])
        self.call(c, "GET", "/api/children/c-nobody", status=404)


class AuditTests(ApiTestCase):
    def test_sensitive_opening_is_logged_and_only_director_reads_it(self):
        edu = self.as_user("educateur")
        before = AuditEntry.objects.count()
        self.call(edu, "POST", "/api/children/c-yassine/audit", {"block": "health"})
        self.call(edu, "POST", "/api/children/c-yassine/audit", {"block": "family"})  # non tracé
        self.assertEqual(AuditEntry.objects.count(), before + 1)
        self.call(edu, "GET", "/api/audit/sensitive-access", status=403)
        log = self.call(self.as_user("directeur"), "GET", "/api/audit/sensitive-access?period=mois")
        first = log["entries"][0]
        self.assertEqual((first["userId"], first["childId"], first["block"]), ("u-edu", "c-yassine", "health"))
        self.assertEqual(len(log["children"]), 6)
        only_psy = self.call(self.as_user("directeur"), "GET", "/api/audit/sensitive-access?userId=u-psy")
        self.assertTrue(all(e["userId"] == "u-psy" for e in only_psy["entries"]))

    def test_audit_log_is_append_only(self):
        entry = AuditEntry.objects.first()
        with self.assertRaises(PermissionDenied):
            entry.delete()
        with self.assertRaises(PermissionDenied):
            AuditEntry.objects.all().delete()
        with self.assertRaises(PermissionDenied):
            AuditEntry.objects.update(action="ouverture_sante")
        entry.action = "ouverture_sante"
        with self.assertRaises(PermissionDenied):
            entry.save()


class SessionTests(ApiTestCase):
    def test_create_consultation_shares_note_and_updates_mood(self):
        psy, edu = self.as_user("psy"), self.as_user("educateur")
        payload = self.consultation(humeur=5, privateNote="secret", sharedNote={"text": "À partager", "recipientIds": ["u-edu", "u-psy", "u-intrus"]})
        res = self.call(psy, "POST", "/api/sessions", payload)
        s = res["session"]
        self.assertEqual([r["userId"] for r in s["sharedNote"]["recipients"]], ["u-edu"])  # ni soi-même ni hors équipe
        self.assertEqual(res["child"]["mood"]["level"], 5)
        self.assertFalse(res["roadmapProposed"])
        received = self.call(edu, "GET", "/api/notes/received?childId=c-yassine")
        note = next(n for n in received if n["sessionId"] == s["id"])
        self.assertEqual(note["text"], "À partager")
        self.assertNotIn("privateNote", note)
        self.assertTrue(Notification.objects.filter(user_id="u-edu", kind="note_recue", child_id="c-yassine", read_at__isnull=True).exists())
        self.call(edu, "POST", "/api/children/c-yassine/notes/read-all")
        self.assertFalse(Notification.objects.filter(user_id="u-edu", kind="note_recue", child_id="c-yassine", read_at__isnull=True).exists())

    def test_session_privacy(self):
        psy, edu, dire = self.as_user("psy"), self.as_user("educateur"), self.as_user("directeur")
        self.call(edu, "GET", "/api/sessions/se-yas-1", status=403)  # séance du psy
        self.assertEqual(self.call(psy, "GET", "/api/sessions/se-yas-1")["privateNote"], "Piste à explorer : relation avec le grand frère.")
        mine = self.call(edu, "GET", "/api/children/c-yassine/sessions")
        self.assertTrue(mine and all(s["authorId"] == "u-edu" for s in mine))
        self.call(dire, "GET", "/api/children/c-yassine/sessions", status=403)
        self.call(dire, "GET", "/api/notes/received", status=403)
        self.call(dire, "POST", "/api/sessions", self.consultation(privateNote="x"), status=403)

    def test_session_validation(self):
        psy = self.as_user("psy")
        self.call(psy, "POST", "/api/sessions", self.consultation(), status=400)  # aucune zone
        self.call(psy, "POST", "/api/sessions", self.consultation(sharedNote={"text": "x", "recipientIds": []}), status=400)
        self.call(psy, "POST", "/api/sessions", self.observation("x"), status=400)  # mauvais type pour le rôle
        tomorrow = (timeutil.today() + timedelta(days=1)).isoformat()
        self.call(psy, "POST", "/api/sessions", self.consultation(privateNote="x", date=tomorrow), status=400)
        bad = self.consultation(privateNote="x")
        bad["details"]["scales"]["humeur"] = 9
        self.call(psy, "POST", "/api/sessions", bad, status=400)

    def test_edit_window_and_no_clearing(self):
        psy = self.as_user("psy")
        s = self.call(psy, "POST", "/api/sessions", self.consultation(privateNote="v1"))["session"]
        update = {k: v for k, v in self.consultation(privateNote="v2").items() if k != "childId"}
        self.assertEqual(self.call(psy, "PUT", f"/api/sessions/{s['id']}/edit", update)["session"]["privateNote"], "v2")
        self.call(psy, "PUT", f"/api/sessions/{s['id']}/edit", {**update, "privateNote": None, "aiNote": "ok"}, status=400)
        self.call(self.as_user("educateur"), "PUT", f"/api/sessions/{s['id']}/edit", update, status=403)
        Session.objects.filter(pk=s["id"]).update(created_at=timeutil.now() - timedelta(hours=25))
        self.call(psy, "PUT", f"/api/sessions/{s['id']}/edit", update, status=409)

    def test_mark_note_read_is_per_recipient(self):
        edu, soc = self.as_user("educateur"), self.as_user("social")
        self.call(edu, "POST", "/api/sessions/se-ami-1/read")
        self.call(soc, "POST", "/api/sessions/se-yas-1/read", status=404)  # pas destinataire
        notes = {n["sessionId"]: n for n in self.call(edu, "GET", "/api/notes/received")}
        self.assertIsNotNone(notes["se-ami-1"]["readAt"])
        self.assertIsNone(notes["se-ami-2"]["readAt"])

    def test_auto_proposal_at_threshold(self):
        edu = self.as_user("educateur")
        status = self.call(edu, "GET", "/api/children/c-yassine/ai-status")
        self.assertEqual(status, {"pending": 3, "threshold": 5})
        self.assertFalse(self.call(edu, "POST", "/api/sessions", self.observation("Très à l'aise en calcul, réussi l'exercice."))["roadmapProposed"])
        res = self.call(edu, "POST", "/api/sessions", self.observation("Ponctuel toute la semaine, motivé."))
        self.assertTrue(res["roadmapProposed"])
        self.assertEqual(self.call(edu, "GET", "/api/children/c-yassine/ai-status")["pending"], 0)
        roadmap = self.call(edu, "GET", "/api/children/c-yassine/roadmap")
        self.assertEqual(roadmap["parts"]["education"]["pending"]["trigger"], "auto")


class RoadmapTests(ApiTestCase):
    def test_generate_validate_reject_comment(self):
        edu, psy, soc, dire = (self.as_user(u) for u in ("educateur", "psy", "social", "directeur"))
        self.call(dire, "POST", "/api/children/c-yassine/roadmap/proposals", status=403)
        res = self.call(soc, "POST", "/api/children/c-yassine/roadmap/proposals")
        self.assertEqual(set(res["proposedParts"]), {"education", "psychologique", "sociale"})
        pending = res["roadmap"]["parts"]["education"]["pending"]
        self.assertTrue(all(ch["sourceSessionIds"] == ["se-yas-2"] for ch in pending["changes"]))
        self.assertTrue(Notification.objects.filter(user_id="u-edu", kind="validation_attendue", child_id="c-yassine").exists())

        self.call(psy, "POST", "/api/children/c-yassine/roadmap/parts/education/validate", {}, status=403)
        self.call(psy, "POST", "/api/children/c-yassine/roadmap/parts/education/comments", {"text": "D'accord"})
        r = self.call(edu, "POST", "/api/children/c-yassine/roadmap/parts/education/validate", {})
        part = r["parts"]["education"]
        self.assertEqual((part["validated"]["version"], part["validated"]["decision"], part["pending"]), (2, "valide", None))
        self.assertEqual(r["progressPercent"], 50)
        self.call(edu, "POST", "/api/children/c-yassine/roadmap/parts/education/validate", {}, status=409)

        self.call(psy, "POST", "/api/children/c-yassine/roadmap/parts/psychologique/reject", {"justification": " "}, status=400)
        r = self.call(psy, "POST", "/api/children/c-yassine/roadmap/parts/psychologique/reject", {"justification": "Trop tôt"})
        self.assertEqual(r["parts"]["psychologique"]["rejected"][-1]["justification"], "Trop tôt")
        self.call(psy, "POST", "/api/children/c-yassine/roadmap/parts/nope/reject", {"justification": "x"}, status=404)

    def test_modified_validation_requires_valid_content_and_justification(self):
        edu = self.as_user("educateur")
        roadmap = self.call(edu, "GET", "/api/children/c-nour/roadmap")
        content = roadmap["parts"]["education"]["pending"]["content"]
        url = "/api/children/c-nour/roadmap/parts/education/validate"
        self.call(edu, "POST", url, {"modifiedContent": content}, status=400)  # justification manquante
        self.call(edu, "POST", url, {"modifiedContent": {"levelNow": 3}, "justification": "x"}, status=400)
        r = self.call(edu, "POST", url, {"modifiedContent": {**content, "levelNow": "1re sec."}, "justification": "Ajusté"})
        v = r["parts"]["education"]["validated"]
        self.assertEqual((v["decision"], v["content"]["levelNow"], v["justification"]), ("modifie", "1re sec.", "Ajusté"))

    def test_sources_text_only_for_author(self):
        edu, psy, dire = self.as_user("educateur"), self.as_user("psy"), self.as_user("directeur")
        by_edu = {s["sessionId"]: s for s in self.call(edu, "GET", "/api/children/c-yassine/roadmap/sources")}
        by_psy = {s["sessionId"]: s for s in self.call(psy, "GET", "/api/children/c-yassine/roadmap/sources")}
        by_dir = self.call(dire, "GET", "/api/children/c-yassine/roadmap/sources")
        self.assertIsNotNone(by_edu["se-yas-2"]["text"])
        self.assertIsNone(by_psy["se-yas-2"]["text"])
        self.assertTrue(all(s["text"] is None for s in by_dir))

    def test_director_reads_roadmap_but_cannot_change_it(self):
        dire = self.as_user("directeur")
        self.call(dire, "GET", "/api/children/c-nour/roadmap")
        self.call(dire, "PUT", "/api/children/c-nour/roadmap/goal", {"objective": "x", "careerTrack": "y", "progressPercent": 10}, status=403)
        r = self.call(self.as_user("psy"), "PUT", "/api/children/c-nour/roadmap/goal", {"objective": "Nouvel objectif", "careerTrack": "Pâtissière", "progressPercent": 75})
        self.assertEqual(r["objective"], "Nouvel objectif")


class FollowupTests(ApiTestCase):
    def test_attendance_rules(self):
        edu, psy = self.as_user("educateur"), self.as_user("psy")
        day = last_weekday_before_today()
        tomorrow = (timeutil.today() + timedelta(days=1)).isoformat()
        self.call(edu, "PUT", "/api/attendance", {"childId": "c-yassine", "date": tomorrow, "status": "present", "reason": None}, status=400)
        self.call(edu, "PUT", "/api/attendance", {"childId": "c-yassine", "date": day, "status": "absent_justifie", "reason": " "}, status=400)
        e = self.call(edu, "PUT", "/api/attendance", {"childId": "c-yassine", "date": day, "status": "present", "reason": "ignored"})
        self.assertIsNone(e["reason"])
        self.call(psy, "PUT", "/api/attendance", {"childId": "c-yassine", "date": day, "status": "present", "reason": None}, status=403)
        month = self.call(psy, "GET", f"/api/children/c-yassine/attendance?from={day}&to={day}")
        self.assertEqual(month, [{"childId": "c-yassine", "date": day, "status": "present", "reason": None}])
        self.call(self.as_user("directeur"), "GET", f"/api/children/c-yassine/attendance?from={day}&to={day}", status=403)

    def test_activities(self):
        edu, psy, soc = self.as_user("educateur"), self.as_user("psy"), self.as_user("social")
        week = timeutil.today() - timedelta(days=timeutil.today().isoweekday() - 1)
        a = self.call(edu, "POST", "/api/activities", {"childId": "c-yassine", "weekday": 3, "start": "09:00", "end": "10:00", "title": "Piscine", "objective": "", "weekStart": week.isoformat()})
        listed = self.call(psy, "GET", f"/api/children/c-yassine/activities?weekStart={week.isoformat()}")
        self.assertIn(a["id"], [x["id"] for x in listed])
        self.assertNotIn(a["id"], [x["id"] for x in self.call(psy, "GET", "/api/children/c-yassine/activities")])
        self.call(edu, "POST", "/api/activities", {**a, "start": "11:00", "end": "10:00"}, status=400)
        self.call(psy, "POST", "/api/activities", a, status=403)
        self.call(soc, "GET", "/api/children/c-yassine/activities", status=403)
        self.assertEqual(self.call(edu, "POST", "/api/activities", {**a, "weekday": 5})["weekday"], 5)
        self.call(edu, "DELETE", f"/api/activities/{a['id']}")
        self.call(edu, "DELETE", f"/api/activities/{a['id']}", status=404)

    def test_aids(self):
        edu, soc = self.as_user("educateur"), self.as_user("social")
        self.assertEqual(len(self.call(edu, "GET", "/api/aid-programs")), 4)
        app = self.call(edu, "GET", "/api/children/c-rania/aid-applications")[0]
        self.assertEqual(app["missingDocuments"], "")  # détail réservé au social
        self.assertTrue(self.call(soc, "GET", "/api/children/c-rania/aid-applications")[0]["missingDocuments"])
        self.call(soc, "POST", "/api/aid-applications", {**app, "status": "depose", "submittedAt": None}, status=400)
        saved = self.call(soc, "POST", "/api/aid-applications", {**app, "status": "depose", "submittedAt": timeutil.today().isoformat()})
        self.assertEqual(saved["status"], "depose")
        self.call(edu, "POST", "/api/aid-applications", app, status=403)
        new = self.call(soc, "POST", "/api/aid-applications", {"childId": "c-rania", "programId": "aid-amg1", "beneficiary": "enfant", "status": "a_preparer", "submittedAt": None, "decidedAt": None, "missingDocuments": ""})
        self.assertTrue(new["id"].startswith("ap-"))

    def test_mood_scales_psy_only(self):
        scales = self.call(self.as_user("psy"), "GET", "/api/children/c-yassine/mood-scales")
        self.assertGreaterEqual(len(scales), 6)
        self.assertEqual(scales, sorted(scales, key=lambda s: s["date"]))
        self.call(self.as_user("educateur"), "GET", "/api/children/c-yassine/mood-scales", status=403)


class NotificationAndStatsTests(ApiTestCase):
    def test_notifications(self):
        edu = self.as_user("educateur")
        notes = self.call(edu, "GET", "/api/notifications")
        self.assertEqual(len(notes), 4)
        self.assertEqual(notes[0]["childFirstName"] is not None, True)
        self.call(edu, "POST", f"/api/notifications/{notes[0]['id']}/read")
        self.call(self.as_user("psy"), "POST", f"/api/notifications/{notes[1]['id']}/read")  # pas à lui : sans effet
        self.assertIsNone(Notification.objects.get(pk=notes[1]["id"]).read_at)
        self.call(edu, "POST", "/api/notifications/read-all")
        self.assertFalse(Notification.objects.filter(user_id="u-edu", read_at__isnull=True).exists())

    def test_dashboard(self):
        self.call(self.as_user("psy"), "GET", "/api/stats/dashboard", status=403)
        dire = self.as_user("directeur")
        self.call(dire, "GET", "/api/stats/dashboard?period=semaine", status=400)
        for period in ("mois", "trimestre", "annee"):
            s = self.call(dire, "GET", f"/api/stats/dashboard?period={period}")
            self.assertEqual(s["period"], period)
            self.assertEqual(s["kpis"]["childrenFollowed"]["value"], 6)
            self.assertEqual(sum(p["count"] for p in s["byPhase"]), 6)
            self.assertEqual(len(s["moodByMonth"]), 6)
        s = self.call(dire, "GET", "/api/stats/dashboard?period=mois")
        self.assertEqual([a["childId"] for a in s["alerts"]["roadmapPendingOver7Days"]], ["c-hamza"])
        self.assertEqual(s["pendingValidationsByRole"], {"educateur": 1, "psychologue": 1, "social": 0})
        self.assertEqual(s["staffByRole"], {"educateur": 1, "psychologue": 1, "social": 1})
        self.assertGreater(s["sensitiveAccess"], 0)
        # agrégats seulement : aucun texte de séance dans la réponse
        self.assertNotIn("Piste à explorer", json.dumps(s, ensure_ascii=False))


class AiProviderTests(ApiTestCase):
    @override_settings(AI_PROVIDER="cdis.tests.test_api.bad_provider")
    def test_invalid_provider_output_is_ignored(self):
        res = self.call(self.as_user("educateur"), "POST", "/api/children/c-yassine/roadmap/proposals")
        self.assertEqual(res["proposedParts"], [])

    @override_settings(AI_PROVIDER="cdis.tests.test_api.spy_provider")
    def test_provider_never_receives_identifying_data(self):
        SPY.clear()
        self.call(self.as_user("educateur"), "POST", "/api/children/c-yassine/roadmap/proposals")
        payload = json.dumps(SPY, ensure_ascii=False)
        for forbidden in ("Ben Salah", "Ettadhamen", "Piste à explorer", "Très appliqué à l'atelier", "O+", "Mesure éducative"):
            self.assertNotIn(forbidden, payload)
        self.assertIn("perd patience en lecture", payload)  # note pour l'IA de l'éducateur
        edu_call = next(c for c in SPY if c[0] == "education")
        self.assertTrue(all(n["authorRole"] == "educateur" for n in edu_call[2]))


SPY: list = []


def bad_provider(part, current, notes, context):
    return {"content": {"oops": True}, "changes": [{"field": "x", "summary": "y", "sourceSessionIds": ["se-inconnue"]}]}


def spy_provider(part, current, notes, context):
    SPY.append((part, current, notes, context))
    return None
