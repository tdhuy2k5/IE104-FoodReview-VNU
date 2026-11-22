using FoodReview.Api.Services;

namespace FoodReview.Api.Helpers;

/// <summary>
/// Hỗ trợ kích hoạt đồng bộ Vector Embedding chạy ngầm với DI Scope độc lập.
/// </summary>
public static class RagBackgroundHelper
{
    public static void Enqueue(IServiceScopeFactory scopeFactory, ILogger logger, Func<IRagService, Task> action, string entityLabel)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var ragService = scope.ServiceProvider.GetRequiredService<IRagService>();
                await action(ragService);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Lỗi đồng bộ RAG embedding nền cho {EntityLabel}", entityLabel);
            }
        });
    }
}
