from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RefundRequest, Payment
from .serializers import RefundRequestSerializer, PaymentSerializer
from django.utils import timezone
from courses.models import Enrollment
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
import os
import stripe
import requests
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_51P8zWvSFP015112526TaniaNirmalMockKey")

import logging
logger = logging.getLogger("payments")

class RefundRequestViewSet(viewsets.ModelViewSet):
    queryset = RefundRequest.objects.all()
    serializer_class = RefundRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "admin":
            return RefundRequest.objects.all().order_by("-requested_at")
        return RefundRequest.objects.filter(student=user).order_by("-requested_at")

    def perform_create(self, serializer):
        user = self.request.user
        enrollment_id = self.request.data.get("enrollment")

        try:
            enrollment = Enrollment.objects.get(id=enrollment_id, student=user)
        except Enrollment.DoesNotExist:
            raise ValidationError("Enrollment record not found.")

        # Validation: Cannot request refund unless enrollment is approved
        if enrollment.status != "approved":
            raise ValidationError("You can only request a refund for approved enrollments.")

        # Validation: One refund request per enrollment
        if RefundRequest.objects.filter(student=user, enrollment=enrollment).exists():
            raise ValidationError("A refund request already exists for this enrollment.")

        serializer.save(student=user)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        refund = self.get_object()
        if refund.status != "Pending":
            return Response({"error": "This request has already been processed."}, status=status.HTTP_400_BAD_REQUEST)

        refund.status = "Approved"
        refund.reviewed_at = timezone.now()
        refund.save()
        try:
            from notifications.services import send_refund_notification
            send_refund_notification(refund)
        except Exception as e:
            pass

        return Response({"message": "Refund request approved."})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        refund = self.get_object()
        if refund.status != "Pending":
            return Response({"error": "This request has already been processed."}, status=status.HTTP_400_BAD_REQUEST)

        refund.status = "Rejected"
        refund.reviewed_at = timezone.now()
        refund.save()
        try:
            from notifications.services import send_refund_notification
            send_refund_notification(refund)
        except Exception as e:
            pass

        return Response({"message": "Refund request rejected."})


class CreateStripeCheckoutSession(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        enrollment_id = request.data.get("enrollment_id")
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id, student=request.user)
        except Enrollment.DoesNotExist:
            logger.warning(f"Stripe checkout request failed: Enrollment {enrollment_id} not found.")
            return Response({"error": "Enrollment not found"}, status=404)

        course = enrollment.course
        if course.price <= 0:
            logger.warning(f"Stripe checkout request failed: Course {course.id} is free.")
            return Response({"error": "This course is free."}, status=400)

        try:
            amount_cents = int(course.price * 100)
            
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'inr',
                        'product_data': {
                            'name': course.title,
                            'description': course.description[:250],
                        },
                        'unit_amount': amount_cents,
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"http://localhost:5173/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url="http://localhost:5173/payment-cancel",
                metadata={
                    'enrollment_id': str(enrollment.id),
                    'student_id': str(request.user.id)
                }
            )

            payment, created = Payment.objects.update_or_create(
                enrollment=enrollment,
                defaults={
                    'student': request.user,
                    'provider': 'Stripe',
                    'payment_intent_id': session.id,
                    'amount': course.price,
                    'currency': 'INR',
                    'status': 'Pending'
                }
            )

            logger.info(f"Stripe checkout session created: {session.id} for enrollment {enrollment.id}")
            return Response({"id": session.id, "url": session.url})
        except Exception as e:
            logger.error(f"Failed to create Stripe session for enrollment {enrollment.id}: {str(e)}")
            return Response({"error": str(e)}, status=400)


class CheckStripeSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id")
        if not session_id:
            logger.warning("Stripe check session failed: session_id missing.")
            return Response({"error": "session_id is required"}, status=400)

        try:
            session = stripe.checkout.Session.retrieve(session_id)
            if session.payment_status == 'paid':
                payment = Payment.objects.get(payment_intent_id=session_id)
                payment.status = "Paid"
                payment.transaction_id = session.payment_intent
                payment.save()

                enrollment = payment.enrollment
                enrollment.status = "approved"
                enrollment.save()
                try:
                    from notifications.services import send_enrollment_notification
                    send_enrollment_notification(enrollment)
                except Exception as e:
                    pass

                logger.info(f"Stripe payment success verified: {session_id} for enrollment {enrollment.id}")
                return Response({"status": "Paid", "message": "Payment verified."})
            logger.warning(f"Stripe session check incomplete status: {session.payment_status} for {session_id}")
            return Response({"status": session.payment_status, "message": "Payment not completed."})
        except Exception as e:
            logger.error(f"Stripe session check verification failed for {session_id}: {str(e)}")
            return Response({"error": str(e)}, status=400)


class CreatePayPalOrder(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        enrollment_id = request.data.get("enrollment_id")
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id, student=request.user)
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found"}, status=404)

        course = enrollment.course
        if course.price <= 0:
            return Response({"error": "This course is free."}, status=400)

        client_id = os.getenv("PAYPAL_CLIENT_ID", "mock_paypal_client_id")
        client_secret = os.getenv("PAYPAL_SECRET", "mock_paypal_secret")

        is_mock = client_id == "mock_paypal_client_id"

        if is_mock:
            import uuid
            order_id = f"PAY-MOCK-{uuid.uuid4().hex[:12].upper()}"
            payment, created = Payment.objects.update_or_create(
                enrollment=enrollment,
                defaults={
                    'student': request.user,
                    'provider': 'PayPal',
                    'transaction_id': order_id,
                    'amount': course.price,
                    'currency': 'INR',
                    'status': 'Pending'
                }
            )
            return Response({"id": order_id, "approval_url": f"http://localhost:5173/payment-success?paypal_order_id={order_id}"})

        try:
            auth_response = requests.post(
                "https://api-m.sandbox.paypal.com/v1/oauth2/token",
                auth=(client_id, client_secret),
                data={"grant_type": "client_credentials"}
            )
            access_token = auth_response.json().get("access_token")

            order_response = requests.post(
                "https://api-m.sandbox.paypal.com/v2/checkout/orders",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {access_token}"
                },
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "amount": {
                            "currency_code": "INR",
                            "value": str(course.price)
                        },
                        "custom_id": str(enrollment.id)
                    }],
                    "application_context": {
                        "return_url": "http://localhost:5173/payment-success",
                        "cancel_url": "http://localhost:5173/payment-cancel"
                    }
                }
            )
            order_data = order_response.json()
            order_id = order_data.get("id")
            
            approval_url = ""
            for link in order_data.get("links", []):
                if link.get("rel") == "approve":
                    approval_url = link.get("href")

            payment, created = Payment.objects.update_or_create(
                enrollment=enrollment,
                defaults={
                    'student': request.user,
                    'provider': 'PayPal',
                    'transaction_id': order_id,
                    'amount': course.price,
                    'currency': 'INR',
                    'status': 'Pending'
                }
            )

            return Response({"id": order_id, "approval_url": approval_url})
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class CapturePayPalOrder(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        try:
            payment = Payment.objects.get(transaction_id=order_id, student=request.user)
        except Payment.DoesNotExist:
            logger.warning(f"PayPal capture failed: Payment record for order {order_id} not found.")
            return Response({"error": "Payment record not found"}, status=404)

        client_id = os.getenv("PAYPAL_CLIENT_ID", "mock_paypal_client_id")
        client_secret = os.getenv("PAYPAL_SECRET", "mock_paypal_secret")

        is_mock = client_id == "mock_paypal_client_id"

        if is_mock:
            payment.status = "Paid"
            payment.save()

            enrollment = payment.enrollment
            enrollment.status = "approved"
            enrollment.save()
            try:
                from notifications.services import send_enrollment_notification
                send_enrollment_notification(enrollment)
            except Exception as e:
                pass

            logger.info(f"PayPal mock payment captured successfully: order {order_id} for enrollment {enrollment.id}")
            return Response({"status": "Paid", "message": "Mock payment captured successfully."})

        try:
            auth_response = requests.post(
                "https://api-m.sandbox.paypal.com/v1/oauth2/token",
                auth=(client_id, client_secret),
                data={"grant_type": "client_credentials"}
            )
            access_token = auth_response.json().get("access_token")

            capture_response = requests.post(
                f"https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}/capture",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {access_token}"
                }
            )
            capture_data = capture_response.json()
            if capture_data.get("status") == "COMPLETED":
                payment.status = "Paid"
                payment.save()

                enrollment = payment.enrollment
                enrollment.status = "approved"
                enrollment.save()
                try:
                    from notifications.services import send_enrollment_notification
                    send_enrollment_notification(enrollment)
                except Exception as e:
                    pass

                logger.info(f"PayPal sandbox payment captured: order {order_id} for enrollment {enrollment.id}")
                return Response({"status": "Paid", "message": "PayPal order captured successfully."})
            logger.warning(f"PayPal capture incomplete status: {capture_data.get('status')} for order {order_id}")
            return Response({"status": capture_data.get("status"), "message": "Failed to capture PayPal order."}, status=400)
        except Exception as e:
            logger.error(f"PayPal capture request failed for order {order_id}: {str(e)}")
            return Response({"error": str(e)}, status=400)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_test")

        if not endpoint_secret or endpoint_secret == "whsec_test":
            import json
            try:
                event = json.loads(payload)
            except Exception:
                logger.error("Stripe webhook: JSON payload parsing failed.")
                return Response(status=400)
        else:
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, endpoint_secret
                )
            except Exception as e:
                logger.error(f"Stripe webhook signature verification failed: {str(e)}")
                return Response(status=400)

        event_type = event.get('type')
        logger.info(f"Stripe Webhook received event: {event_type}")

        if event_type == 'checkout.session.completed':
            session = event['data']['object']
            metadata = session.get('metadata', {})
            enrollment_id = metadata.get('enrollment_id')
            if enrollment_id:
                try:
                    payment = Payment.objects.get(payment_intent_id=session.get('id'))
                    payment.status = "Paid"
                    payment.transaction_id = session.get('payment_intent')
                    payment.save()

                    enrollment = payment.enrollment
                    enrollment.status = "approved"
                    enrollment.save()
                    try:
                        from notifications.services import send_enrollment_notification
                        send_enrollment_notification(enrollment)
                    except Exception as e:
                        pass
                    logger.info(f"Stripe Webhook processed success: Session {session.get('id')} for enrollment {enrollment_id}")
                except Payment.DoesNotExist:
                    logger.warning(f"Stripe Webhook: Payment record not found for session {session.get('id')}")
                    pass

        elif event_type == 'charge.dispute.created':
            dispute = event['data']['object']
            charge_id = dispute.get('charge')
            payment_intent_id = dispute.get('payment_intent')
            from django.db.models import Q
            payment = Payment.objects.filter(
                Q(transaction_id=charge_id) | Q(payment_intent_id=payment_intent_id) | Q(transaction_id=payment_intent_id)
            ).first()

            if payment:
                payment.status = "Disputed"
                payment.disputed_at = timezone.now()
                payment.dispute_reference = dispute.get('id')
                payment.save()

                RefundRequest.objects.update_or_create(
                    student=payment.student,
                    enrollment=payment.enrollment,
                    defaults={
                        'reason': f"Access revoked due to payment dispute {dispute.get('id')}.",
                        'status': "Approved",
                        'reviewed_at': timezone.now()
                    }
                )
                logger.info(f"Stripe dispute created: {dispute.get('id')} for payment {payment.id}. Entitlement revoked.")

        elif event_type == 'charge.dispute.closed':
            dispute = event['data']['object']
            charge_id = dispute.get('charge')
            payment_intent_id = dispute.get('payment_intent')
            from django.db.models import Q
            payment = Payment.objects.filter(
                Q(transaction_id=charge_id) | Q(payment_intent_id=payment_intent_id) | Q(transaction_id=payment_intent_id)
            ).first()

            if payment:
                dispute_status = dispute.get('status')
                if dispute_status == 'won':
                    payment.status = "Paid"
                    payment.save()

                    refund_req = RefundRequest.objects.filter(enrollment=payment.enrollment).first()
                    if refund_req:
                        refund_req.status = "Rejected"
                        refund_req.reviewed_at = timezone.now()
                        refund_req.save()
                    logger.info(f"Stripe dispute resolved (won): {dispute.get('id')} for payment {payment.id}. Entitlement restored.")
                else:
                    logger.info(f"Stripe dispute resolved (lost): {dispute.get('id')} for payment {payment.id}. Entitlement remains revoked.")

        elif event_type == 'charge.refunded':
            charge = event['data']['object']
            charge_id = charge.get('id')
            payment_intent_id = charge.get('payment_intent')
            from django.db.models import Q
            payment = Payment.objects.filter(
                Q(transaction_id=charge_id) | Q(payment_intent_id=payment_intent_id) | Q(transaction_id=payment_intent_id)
            ).first()

            if payment:
                payment.status = "Refunded"
                payment.save()

                RefundRequest.objects.update_or_create(
                    student=payment.student,
                    enrollment=payment.enrollment,
                    defaults={
                        'reason': "Access revoked due to refund event.",
                        'status': "Approved",
                        'reviewed_at': timezone.now()
                    }
                )
                logger.info(f"Stripe charge refunded: {charge_id} for payment {payment.id}. Entitlement revoked.")

        return Response(status=200)


@method_decorator(csrf_exempt, name='dispatch')
class PayPalWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import json
        try:
            event = json.loads(request.body)
            event_type = event.get("event_type")
            logger.info(f"PayPal Webhook received event: {event_type}")

            if event_type in ["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED"]:
                resource = event.get("resource", {})
                order_id = resource.get("id")
                payment = Payment.objects.filter(transaction_id=order_id).first()
                if payment:
                    payment.status = "Paid"
                    payment.save()

                    enrollment = payment.enrollment
                    enrollment.status = "approved"
                    enrollment.save()
                    try:
                        from notifications.services import send_enrollment_notification
                        send_enrollment_notification(enrollment)
                    except Exception as e:
                        pass
                    logger.info(f"PayPal Webhook processed success: Order {order_id} for enrollment {enrollment.id}")
                else:
                    logger.warning(f"PayPal Webhook: Payment record not found for order {order_id}")

            elif "DISPUTE" in event_type or "dispute" in event_type.lower():
                resource = event.get("resource", {})
                dispute_id = resource.get("id")

                transaction_id = None
                if "disputed_transactions" in resource:
                    for tx in resource["disputed_transactions"]:
                        if "seller_transaction_id" in tx:
                            transaction_id = tx["seller_transaction_id"]
                            break
                if not transaction_id:
                    transaction_id = resource.get("buyer_transaction_id")

                payment = None
                if transaction_id:
                    payment = Payment.objects.filter(transaction_id=transaction_id).first()

                if "CREATED" in event_type or "opened" in event_type.lower():
                    if payment:
                        payment.status = "Disputed"
                        payment.disputed_at = timezone.now()
                        payment.dispute_reference = dispute_id
                        payment.save()

                        RefundRequest.objects.update_or_create(
                            student=payment.student,
                            enrollment=payment.enrollment,
                            defaults={
                                'reason': f"Access revoked due to PayPal dispute {dispute_id}.",
                                'status': "Approved",
                                'reviewed_at': timezone.now()
                            }
                        )
                        logger.info(f"PayPal dispute created: {dispute_id} for payment {payment.id}. Entitlement revoked.")

                elif "RESOLVED" in event_type or "resolved" in event_type.lower():
                    outcome = resource.get("outcome", {})
                    outcome_code = outcome.get("outcome_code", "")

                    if "MERCHANT" in outcome_code.upper() or "FAVOR_OF_MERCHANT" in outcome_code.upper():
                        if payment:
                            payment.status = "Paid"
                            payment.save()

                            refund_req = RefundRequest.objects.filter(enrollment=payment.enrollment).first()
                            if refund_req:
                                refund_req.status = "Rejected"
                                refund_req.reviewed_at = timezone.now()
                                refund_req.save()
                            logger.info(f"PayPal dispute resolved (won): {dispute_id} for payment {payment.id}. Entitlement restored.")
                    else:
                        logger.info(f"PayPal dispute resolved (lost): {dispute_id} for payment {payment.id}. Entitlement remains revoked.")

            return Response(status=200)
        except Exception as e:
            logger.error(f"PayPal Webhook processing error: {str(e)}")
            return Response(status=400)


class RefundPaymentView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            logger.warning(f"Refund failed: Payment {payment_id} not found.")
            return Response({"error": "Payment not found"}, status=404)

        if payment.status != "Paid":
            logger.warning(f"Refund failed: Payment {payment_id} status is {payment.status} (not Paid).")
            return Response({"error": "Only paid transactions can be refunded."}, status=400)

        logger.info(f"Admin initiated refund for payment {payment_id} via provider {payment.provider}")

        if payment.provider == "Stripe":
            try:
                stripe.Refund.create(
                    payment_intent=payment.transaction_id,
                )
                logger.info(f"Stripe refund API call succeeded for payment intent {payment.transaction_id}")
            except Exception as e:
                logger.error(f"Stripe refund API error: {str(e)}")
        elif payment.provider == "PayPal":
            client_id = os.getenv("PAYPAL_CLIENT_ID", "mock_paypal_client_id")
            client_secret = os.getenv("PAYPAL_SECRET", "mock_paypal_secret")
            if client_id != "mock_paypal_client_id":
                try:
                    auth_response = requests.post(
                        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
                        auth=(client_id, client_secret),
                        data={"grant_type": "client_credentials"}
                    )
                    access_token = auth_response.json().get("access_token")
                    requests.post(
                        f"https://api-m.sandbox.paypal.com/v2/payments/captures/{payment.transaction_id}/refund",
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {access_token}"
                        },
                        json={}
                    )
                    logger.info(f"PayPal refund API call succeeded for capture ID {payment.transaction_id}")
                except Exception as e:
                    logger.error(f"PayPal refund API error: {str(e)}")

        payment.status = "Refunded"
        payment.save()

        refund_req = RefundRequest.objects.filter(enrollment=payment.enrollment).first()
        if refund_req:
            refund_req.status = "Approved"
            refund_req.reviewed_at = timezone.now()
            refund_req.save()
        else:
            refund_req = RefundRequest.objects.create(
                student=payment.student,
                enrollment=payment.enrollment,
                reason="System initiated admin refund.",
                status="Approved",
                reviewed_at=timezone.now()
            )
        try:
            from notifications.services import send_refund_notification
            send_refund_notification(refund_req)
        except Exception as e:
            pass

        logger.info(f"Refund successfully completed for payment {payment_id}. Enrollment access revoked.")
        return Response({"status": "Refunded", "message": "Refund processed and entitlement revoked."})


class PaymentHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == "admin":
            payments = Payment.objects.all().order_by("-created_at")
        else:
            payments = Payment.objects.filter(student=user).order_by("-created_at")
        
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)
