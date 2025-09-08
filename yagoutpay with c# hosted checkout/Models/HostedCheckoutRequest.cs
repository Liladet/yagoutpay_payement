namespace YagoutPayHostedCheckout.Models
{
    public class HostedCheckoutRequest
    {
        public decimal Amount { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public string? SuccessUrl { get; set; }
        public string? FailureUrl { get; set; }
        public string? OrderId { get; set; }
    }
}