from django.core.management.base import BaseCommand

from cdis.seed import load_demo


class Command(BaseCommand):
    help = "Efface les données métier et charge la base de démonstration FICTIVE (dates relatives à aujourd'hui)."

    def add_arguments(self, parser):
        parser.add_argument("--if-empty", action="store_true", help="Ne rien faire si des enfants existent déjà.")

    def handle(self, *args, if_empty=False, **options):
        from cdis.models import Child

        if if_empty and Child.objects.exists():
            self.stdout.write("Base déjà initialisée : rien à faire.")
            return
        load_demo()
        self.stdout.write(self.style.SUCCESS("Démo chargée : comptes educateur, psy, social, directeur (mot de passe « demo »)."))
