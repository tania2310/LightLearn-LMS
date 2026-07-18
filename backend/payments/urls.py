from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    RefundRequestViewSet,
    CreatePayPalOrder,
    CapturePayPalOrder,
    PayPalWebhookView,
    RefundPaymentView,
    PaymentHistoryView,
    DownloadReceiptView,
)

router = DefaultRouter()
router.register(r"refunds", RefundRequestViewSet)

urlpatterns = router.urls + [
    path("paypal/create-order/", CreatePayPalOrder.as_view(), name="paypal-create-order"),
    path("paypal/capture-order/", CapturePayPalOrder.as_view(), name="paypal-capture-order"),
    path("paypal/webhook/", PayPalWebhookView.as_view(), name="paypal-webhook"),
    path("refund/<int:payment_id>/", RefundPaymentView.as_view(), name="refund-payment"),
    path("history/", PaymentHistoryView.as_view(), name="payment-history"),
    path("receipt/<int:payment_id>/", DownloadReceiptView.as_view(), name="payment-receipt"),
]
