using Microsoft.AspNetCore.Mvc;
using YagoutPayHostedCheckout.Models;
using YagoutPayHostedCheckout.Services;
using System;

namespace YagoutPayHostedCheckout.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HostedCheckoutController : ControllerBase
    {
        private const string MERCHANT_ID = "your_merchant_id";
        private const string ENCRYPTION_KEY = "your_encryption_key";
        private const bool TEST_MODE = true;

        [HttpPost("redirect")]
        public IActionResult RedirectToHostedCheckout([FromBody] HostedCheckoutRequest request)
        {
            try
            {
                var hostedCheckout = new YagoutHostedCheckout(MERCHANT_ID, ENCRYPTION_KEY, TEST_MODE);
                string htmlForm = hostedCheckout.GeneratePaymentForm(
                    request.Amount,
                    request.CustomerName,
                    request.CustomerEmail,
                    request.CustomerPhone,
                    request.SuccessUrl,
                    request.FailureUrl,
                    request.OrderId
                );

                return Content(htmlForm, "text/html");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("test")]
        public IActionResult TestHostedCheckout()
        {
            var hostedCheckout = new YagoutHostedCheckout(MERCHANT_ID, ENCRYPTION_KEY, TEST_MODE);

            string htmlForm = hostedCheckout.GeneratePaymentForm(
                amount: 1.00m,
                customerName: "Test Customer",
                email: "test@example.com",
                phone: "0912345678",
                successUrl: "https://yourdomain.com/api/hostedcheckout/success",
                failureUrl: "https://yourdomain.com/api/hostedcheckout/failure",
                orderId: Guid.NewGuid().ToString().Substring(0, 12)
            );

            return Content(htmlForm, "text/html");
        }

        [HttpPost("success")]
        public IActionResult SuccessCallback([FromForm] YagoutCallback callback)
        {
            try
            {
                var hostedCheckout = new YagoutHostedCheckout(MERCHANT_ID, ENCRYPTION_KEY);
                bool isValid = hostedCheckout.VerifyCallback(callback);

                if (isValid)
                {
                    return Ok(new
                    {
                        status = "success",
                        message = "Payment processed successfully",
                        order_id = callback.OrderNo,
                        transaction_id = callback.TransactionId
                    });
                }
                else
                {
                    return BadRequest(new { error = "Invalid callback signature" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("failure")]
        public IActionResult FailureCallback([FromForm] YagoutCallback callback)
        {
            try
            {
                return Ok(new
                {
                    status = "failed",
                    message = "Payment failed",
                    order_id = callback.OrderNo,
                    reason = callback.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}