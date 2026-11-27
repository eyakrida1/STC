"""
Administration Django (/admin/) : comptes, pôles, affectation des enfants aux intervenants, programmes d'aide.
Le contenu des séances n'y est pas lisible ; le journal d'audit est en lecture seule.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AidProgram, AuditEntry, Child, ClosedStay, Pole, User


@admin.register(Pole)
class PoleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "city")


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "first_name", "last_name", "role", "pole", "is_active")
    list_filter = ("role", "pole", "is_active")
    fieldsets = (
        (None, {"fields": ("id", "username", "password")}),
        ("Identité", {"fields": ("first_name", "last_name", "birth_date", "email", "phone", "cin", "avatar_seed")}),
        ("Rôle", {"fields": ("role", "pole", "is_active", "is_staff", "is_superuser")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("id", "username", "role", "pole", "password1", "password2")}),
    )
    readonly_fields = ("id",)

    def get_readonly_fields(self, request, obj=None):
        return ("id",) if obj else ()


@admin.register(Child)
class ChildAdmin(admin.ModelAdmin):
    """Affectations uniquement : la partie commune se modifie dans l'application, par ses propriétaires."""

    list_display = ("code", "first_name", "pole", "educateur", "psychologue", "social")
    list_filter = ("pole",)
    fields = ("id", "code", "pole", "educateur", "psychologue", "social")
    readonly_fields = ("id", "code", "pole")

    @admin.display(description="Prénom")
    def first_name(self, obj):
        return obj.identity.get("firstName", "")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AidProgram)
class AidProgramAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "position")


@admin.register(AuditEntry)
class AuditEntryAdmin(admin.ModelAdmin):
    list_display = ("at", "user", "child", "action")
    list_filter = ("action",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ClosedStay)
class ClosedStayAdmin(admin.ModelAdmin):
    list_display = ("id", "pole", "entry_date", "exit_date", "exit_destination")
