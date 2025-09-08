using YagoutPayHostedCheckout.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register YagoutPay hosted checkout service
builder.Services.AddSingleton<YagoutHostedCheckout>(provider =>
    new YagoutHostedCheckout(
        "your_merchant_id",
        "your_encryption_key",
        true // test mode
    )
);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();