"""
Modèle de données CDIS — miroir de frontend/src/types/domain.ts (le contrat de l'API).

Choix de stockage :
- relationnel pour ce qui sert aux droits et aux requêtes (affectations, destinataires d'une note et leur état lu,
  présence, notifications, journal d'audit) ;
- JSON pour les blocs imbriqués du dossier (identité, famille, scolarité…) et les parties de roadmap : leur forme
  est fixée par le contrat et validée par cdis/validation.py avant écriture.
Les identifiants sont des chaînes (« c-yassine », « se-xxxx ») comme dans le contrat.
"""
import secrets

from django.contrib.auth.models import AbstractUser, UserManager
from django.core.exceptions import PermissionDenied
from django.db import models


def new_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(5)}"


ROLE_CHOICES = [
    ("educateur", "Éducateur"),
    ("psychologue", "Psychologue"),
    ("social", "Intervenant social"),
    ("directeur", "Direction"),
]
PRO_ROLES = ("educateur", "psychologue", "social")


class Pole(models.Model):
    id = models.CharField(primary_key=True, max_length=40)
    name = models.CharField(max_length=120)
    city = models.CharField(max_length=120)

    def __str__(self):
        return self.name


class CdisUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra):
        extra.setdefault("id", new_id("u"))
        extra.setdefault("role", "directeur")
        return super().create_superuser(username, email, password, **extra)


class User(AbstractUser):
    """Intervenant ou directeur. first_name / last_name / email viennent d'AbstractUser."""

    id = models.CharField(primary_key=True, max_length=40)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    birth_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    cin = models.CharField(max_length=20, blank=True)  # non modifiable par l'intervenant
    pole = models.ForeignKey(Pole, on_delete=models.PROTECT, null=True, blank=True, related_name="users")
    avatar_seed = models.CharField(max_length=80, blank=True)
    photo_url = models.TextField(null=True, blank=True)  # image réduite (data URL) choisie par l'utilisateur

    objects = CdisUserManager()

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = new_id("u")
        if not self.avatar_seed:
            self.avatar_seed = self.username
        super().save(*args, **kwargs)

    @property
    def is_professional(self) -> bool:
        return self.role in PRO_ROLES

    @property
    def display_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class Child(models.Model):
    """Partie commune du dossier. Chaque bloc JSON a un propriétaire (voir cdis/access.py)."""

    id = models.CharField(primary_key=True, max_length=40)
    code = models.CharField(max_length=40, unique=True)
    pole = models.ForeignKey(Pole, on_delete=models.PROTECT, related_name="children")
    identity = models.JSONField()
    journey = models.JSONField()
    family = models.JSONField()
    economic = models.JSONField()
    schooling = models.JSONField()
    health = models.JSONField()
    legal = models.JSONField()
    interests = models.JSONField()
    mood = models.JSONField()
    consent = models.JSONField()
    # affectations : un intervenant de chaque métier
    educateur = models.ForeignKey(User, on_delete=models.PROTECT, null=True, related_name="+")
    psychologue = models.ForeignKey(User, on_delete=models.PROTECT, null=True, related_name="+")
    social = models.ForeignKey(User, on_delete=models.PROTECT, null=True, related_name="+")

    class Meta:
        verbose_name_plural = "children"

    def assigned_id(self, role: str) -> str | None:
        return getattr(self, f"{role}_id", None) if role in PRO_ROLES else None

    @property
    def team_ids(self) -> list[str]:
        return [i for i in (self.educateur_id, self.psychologue_id, self.social_id) if i]

    def __str__(self):
        return f"{self.code} {self.identity.get('firstName', '')}"


class Session(models.Model):
    """Séance à 3 sorties : note privée (auteur), note partagée (destinataires), note pour l'IA (personne)."""

    id = models.CharField(primary_key=True, max_length=40)
    child = models.ForeignKey(Child, on_delete=models.PROTECT, related_name="sessions")
    author = models.ForeignKey(User, on_delete=models.PROTECT, related_name="sessions")
    author_role = models.CharField(max_length=20, choices=ROLE_CHOICES[:3])
    date = models.DateField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField(null=True, blank=True)
    details = models.JSONField()
    private_note = models.TextField(null=True, blank=True)
    shared_text = models.TextField(null=True, blank=True)
    shared_at = models.DateTimeField(null=True, blank=True)
    ai_text = models.TextField(null=True, blank=True)
    ai_consumed_by = models.CharField(max_length=40, null=True, blank=True)  # id de la génération IA

    class Meta:
        indexes = [models.Index(fields=["child", "author"])]

    def delete(self, *args, **kwargs):
        raise PermissionDenied("Une séance ne se supprime jamais.")


class SharedNoteRecipient(models.Model):
    """Destinataire d'une note partagée, avec son propre état lu."""

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="recipients")
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="received_notes")
    read_at = models.DateTimeField(null=True, blank=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = [("session", "user")]
        ordering = ["position", "id"]


class Roadmap(models.Model):
    """Roadmap commune. `parts` = { education | psychologique | sociale : RoadmapPart } (forme du contrat)."""

    child = models.OneToOneField(Child, on_delete=models.CASCADE, primary_key=True, related_name="roadmap")
    objective = models.TextField()
    career_track = models.CharField(max_length=200)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField()
    parts = models.JSONField()


ATTENDANCE_CHOICES = [("present", "Présent"), ("absent", "Absent"), ("absent_justifie", "Absent justifié")]


class AttendanceEntry(models.Model):
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name="attendance")
    date = models.DateField()
    status = models.CharField(max_length=20, choices=ATTENDANCE_CHOICES)
    reason = models.TextField(null=True, blank=True)

    class Meta:
        unique_together = [("child", "date")]
        verbose_name_plural = "attendance entries"


class Activity(models.Model):
    id = models.CharField(primary_key=True, max_length=40)
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name="activities")
    weekday = models.PositiveSmallIntegerField()  # 1 lundi → 6 samedi
    start = models.CharField(max_length=5)  # "10:00"
    end = models.CharField(max_length=5)
    title = models.CharField(max_length=200)
    objective = models.TextField(blank=True)
    week_start = models.DateField(null=True, blank=True)  # null = chaque semaine

    class Meta:
        verbose_name_plural = "activities"


class AidProgram(models.Model):
    id = models.CharField(primary_key=True, max_length=40)
    label = models.CharField(max_length=200)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]


AID_STATUS_CHOICES = [("a_preparer", "À préparer"), ("depose", "Déposé"), ("accorde", "Accordé"), ("refuse", "Refusé")]


class AidApplication(models.Model):
    id = models.CharField(primary_key=True, max_length=40)
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name="aid_applications")
    program = models.ForeignKey(AidProgram, on_delete=models.PROTECT)
    beneficiary = models.CharField(max_length=10, choices=[("enfant", "Enfant"), ("famille", "Famille")])
    status = models.CharField(max_length=20, choices=AID_STATUS_CHOICES)
    submitted_at = models.DateField(null=True, blank=True)
    decided_at = models.DateField(null=True, blank=True)
    missing_documents = models.TextField(blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]


NOTIFICATION_KINDS = [
    ("note_recue", "Note reçue"),
    ("validation_attendue", "Validation attendue"),
    ("absence", "Absence"),
    ("roadmap_mise_a_jour", "Roadmap mise à jour"),
]


class Notification(models.Model):
    id = models.CharField(primary_key=True, max_length=40)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=30, choices=NOTIFICATION_KINDS)
    child = models.ForeignKey(Child, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField()
    read_at = models.DateTimeField(null=True, blank=True)


class AuditEntryQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise PermissionDenied("Le journal d'audit n'est pas modifiable.")

    def delete(self):
        raise PermissionDenied("Le journal d'audit n'est pas effaçable.")


class AuditEntry(models.Model):
    """
    Journal des ouvertures des blocs Santé / Situation judiciaire : qui, quel enfant, quel bloc, quand.
    Jamais le contenu. Append-only : ni modification ni suppression (au niveau de l'ORM).
    """

    id = models.CharField(primary_key=True, max_length=40)
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="+")
    child = models.ForeignKey(Child, on_delete=models.PROTECT, related_name="+")
    action = models.CharField(
        max_length=30, choices=[("ouverture_sante", "Ouverture Santé"), ("ouverture_judiciaire", "Ouverture Judiciaire")]
    )
    at = models.DateTimeField()

    objects = AuditEntryQuerySet.as_manager()

    class Meta:
        verbose_name_plural = "audit entries"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise PermissionDenied("Le journal d'audit n'est pas modifiable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionDenied("Le journal d'audit n'est pas effaçable.")


EXIT_DESTINATIONS = ["ecole", "formation", "emploi", "famille", "autre_structure", "abandon"]


class ClosedStay(models.Model):
    """Dossier clos anonymisé : seules les dates et la destination servent aux statistiques."""

    id = models.CharField(primary_key=True, max_length=40)
    pole = models.ForeignKey(Pole, on_delete=models.PROTECT, related_name="archives")
    entry_date = models.DateField()
    exit_date = models.DateField()
    exit_destination = models.CharField(max_length=20, choices=[(d, d) for d in EXIT_DESTINATIONS])
