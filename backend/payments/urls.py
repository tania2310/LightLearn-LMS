from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    RefundRequestViewSet,
    CreateStripeCheckoutSession,
    CheckStripeSessionView,
    CreatePayPalOrder,
    CapturePayPalOrder,
    StripeWebhookView,
    PayPalWebhookView,
    RefundPaymentView,
    PaymentHistoryView,
)

router = DefaultRouter()
router.register(r"refunds", RefundRequestViewSet)

urlpatterns = router.urls + [
    path("stripe/create-checkout-session/", CreateStripeCheckoutSession.as_view(), name="stripe-checkout"),
    path("stripe/check-session/", CheckStripeSessionView.as_view(), name="stripe-check-session"),
    path("paypal/create-order/", CreatePayPalOrder.as_view(), name="paypal-create-order"),
    path("paypal/capture-order/", CapturePayPalOrder.as_view(), name="paypal-capture-order"),
    path("stripe/webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
    path("paypal/webhook/", PayPalWebhookView.as_view(), name="paypal-webhook"),
    path("refund/<int:payment_id>/", RefundPaymentView.as_view(), name="refund-payment"),
    path("history/", PaymentHistoryView.as_view(), name="payment-history"),
]
