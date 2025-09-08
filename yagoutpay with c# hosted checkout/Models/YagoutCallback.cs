namespace YagoutPayHostedCheckout.Models
{
    public class YagoutCallback
    {
        public string? OrderNo { get; set; }
        public string? TransactionId { get; set; }
        public string? Status { get; set; }
        public string? Amount { get; set; }
        public string? Message { get; set; }
        public string? Hash { get; set; }
    }
}