from django.conf import settings
from django.urls import path

from .views import RemoteTestView

API_ROOT = (
    settings.V3_DOMAIN_API_ROOT_NO_FRONT_SLASH
    if settings.DOMAIN_ENABLED
    else settings.V3_API_ROOT_NO_FRONT_SLASH
)

urlpatterns = [
    path(f"{API_ROOT}pulpit/remotes/<uuid:pk>/test/", RemoteTestView.as_view()),
]
