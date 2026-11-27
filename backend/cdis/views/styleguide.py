"""Exemples affichés par /styleguide (page publique) : lus dans seed/donnees.py, comme toutes les données de démo."""
from ..http import endpoint
from ..seed.donnees import exemples_styleguide


@endpoint("GET", auth=False)
def examples(request):
    return exemples_styleguide()
