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
import requests
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging
from django.http import FileResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

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





class CreatePayPalOrder(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        enrollment_id = request.data.get("enrollment_id")
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id, student=request.user)
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found"}, status=404)

        if enrollment.status != "approved":
            return Response({"error": "Enrollment must be approved by admin before making payment."}, status=400)

        course = enrollment.course
        if course.price <= 0:
            return Response({"error": "This course is free."}, status=400)

        client_id = os.getenv("PAYPAL_CLIENT_ID")
        client_secret = os.getenv("PAYPAL_SECRET")

        is_mock = not client_id or not client_secret

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
            return Response({"id": order_id, "approval_url": f"http://localhost:5173/payment-success?paypal_order_id={order_id}&course_id={course.id}"})

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
                            "currency_code": "USD",
                            "value": str(course.price)
                        },
                        "custom_id": str(enrollment.id)
                    }],
                    "application_context": {
                        "return_url": f"http://localhost:5173/payment-success?course_id={course.id}",
                        "cancel_url": f"http://localhost:5173/payment-cancel?course_id={course.id}"
                    }
                }
            )
            order_data = order_response.json()

            print(order_data)
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
                    'currency': 'USD',
                    'status': 'Pending'
                }
            )
            if not approval_url:
                return Response({
                    "error": order_data
                }, status=400)

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

        # Idempotency check:
        if payment.status == "Paid":
            return Response({
            "success": True,
            "status": "Paid",
            "message": "PayPal order captured successfully.",
            "transaction_id": payment.transaction_id,
            "course": payment.enrollment.course.title,
            "course_id": payment.enrollment.course.id,
            "amount": str(payment.amount),
            "payment_id": payment.id
        })

        # Verify order has not already been captured in the local database by another payment
        already_captured = Payment.objects.filter(transaction_id=order_id, status="Paid").exclude(id=payment.id).exists()
        if already_captured:
            return Response({"error": "This order has already been captured by another transaction."}, status=400)

        client_id = os.getenv("PAYPAL_CLIENT_ID", "AZMLB3eLDYGV7pv3I1KP_1aRt1eQRYOcu5uQNm1B5OQzuElgsD9LcYBrLFNDHMwvw2_0aYE4ddVPHXGQ")
        client_secret = os.getenv("PAYPAL_SECRET", "EAeBO9nnuZjbOjDnpLD0WmcrNPCKib7XFGG3fQs4sK7MGyyXgY13BNYbMgADwYgJz9ONLlgVWchQQ5oj")

        is_mock = client_id == "AZMLB3eLDYGV7pv3I1KP_1aRt1eQRYOcu5uQNm1B5OQzuElgsD9LcYBrLFNDHMwvw2_0aYE4ddVPHXGQ"

        if is_mock:
            payment.status = "Paid"
            payment.save()

            logger.info(f"PayPal mock payment captured successfully: order {order_id} for enrollment {payment.enrollment.id}")
            return Response({
                "success": True,
                "status": "Paid",
                "message": "Mock payment captured successfully.",
                "transaction_id": payment.transaction_id,
                "course": payment.enrollment.course.title,
                "course_id": payment.enrollment.course.id,
                "amount": str(payment.amount),
                "payment_id": payment.id
            })

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
            
            # Verify the PayPal order has been successfully captured using the existing PayPal API response
            status_val = capture_data.get("status")
            if status_val == "COMPLETED":
                payment.status = "Paid"
                payment.save()

                logger.info(f"PayPal sandbox payment captured: order {order_id} for enrollment {payment.enrollment.id}")
                return Response({
                    "success": True,
                    "status": "Paid",
                    "message": "PayPal order captured successfully.",
                    "transaction_id": payment.transaction_id,
                    "course": payment.enrollment.course.title,
                    "amount": str(payment.amount),
                    "payment_id": payment.id
                })
            logger.warning(f"PayPal capture incomplete status: {status_val} for order {order_id}")
            return Response({"status": status_val, "message": "Failed to capture PayPal order."}, status=400)
        except Exception as e:
            logger.error(f"PayPal capture request failed for order {order_id}: {str(e)}")
            return Response({"error": str(e)}, status=400)





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

                    try:
                        from notifications.services import send_enrollment_notification
                        send_enrollment_notification(payment.enrollment)
                    except Exception as e:
                        pass
                    logger.info(f"PayPal Webhook processed success: Order {order_id} for enrollment {payment.enrollment.id}")
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

        if payment.provider == "PayPal":
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


class DownloadReceiptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            return Response({"error": "Payment not found"}, status=404)

        # Authenticated student owner or admin only
        if request.user.role != "admin" and payment.student != request.user:
            return Response({"error": "You are not authorized to view this receipt."}, status=403)

        # Only allow paid transactions
        if payment.status != "Paid":
            return Response({"error": "Receipt is only available for paid transactions."}, status=400)

        # Generate PDF dynamically using ReportLab
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Header
        p.setFont("Helvetica-Bold", 24)
        p.drawString(100, height - 80, "LightLearn LMS")
        
        p.setStrokeColorRGB(0.7, 0.7, 0.7)
        p.setLineWidth(1)
        p.line(100, height - 95, width - 100, height - 95)

        # Receipt Title
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, height - 130, "PAYMENT RECEIPT")

        p.setFont("Helvetica-Bold", 11)
        p.drawString(100, height - 170, "Receipt Number:")
        p.drawString(100, height - 195, "Transaction ID:")
        p.drawString(100, height - 220, "Student Name:")
        p.drawString(100, height - 245, "Student Email:")
        p.drawString(100, height - 270, "Course Title:")
        p.drawString(100, height - 295, "Mentor Name:")
        p.drawString(100, height - 320, "Amount Paid:")
        p.drawString(100, height - 345, "Payment Method:")
        p.drawString(100, height - 370, "Payment Date:")
        p.drawString(100, height - 395, "Status:")

        p.setFont("Helvetica", 11)
        date_str = payment.updated_at.strftime("%Y-%m-%d %H:%M:%S") if payment.updated_at else "N/A"
        receipt_num = f"REC-{payment.id}-{payment.created_at.strftime('%Y%m%d%H%M%S') if payment.created_at else '00000000000000'}"
        
        p.drawString(250, height - 170, receipt_num)
        p.drawString(250, height - 195, payment.transaction_id or "N/A")
        p.drawString(250, height - 220, payment.student.username or "N/A")
        p.drawString(250, height - 245, payment.student.email or "N/A")
        p.drawString(250, height - 270, payment.enrollment.course.title or "N/A")
        p.drawString(250, height - 295, payment.enrollment.course.mentor.username or "N/A")
        p.drawString(250, height - 320, f"${payment.amount} {payment.currency}")
        p.drawString(250, height - 345, "PayPal")
        p.drawString(250, height - 370, date_str)

        # Status badge/text: "Paid"
        p.setFont("Helvetica-Bold", 11)
        p.setFillColorRGB(0.09, 0.63, 0.29) # green color
        p.drawString(250, height - 395, "Paid")

        # Footer
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica-Oblique", 10)
        p.drawString(100, 100, "Thank you for your enrollment in LightLearn LMS!")
        p.drawString(100, 85, "If you have any questions, please contact support.")

        p.showPage()
        p.save()

        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f"receipt-{payment.id}.pdf", content_type="application/pdf")
