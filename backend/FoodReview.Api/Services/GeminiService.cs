using System.Net.Http.Json;
using System.Text.Json;

namespace FoodReview.Api.Services;

/// <summary>
/// Giao tiếp với Google Gemini REST API cho embedding và câu trả lời.
/// </summary>
public class GeminiService : IGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiService> _logger;

    private string ApiKey => _config["Gemini:ApiKey"]?.Trim() ?? string.Empty;
    public string EmbeddingModel => _config["Gemini:EmbeddingModel"]?.Trim() is { Length: > 0 } m ? m : "gemini-embedding-2";
    private string ChatModel => _config["Gemini:ChatModel"]?.Trim() is { Length: > 0 } m ? m : "gemini-3.6-flash";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);

    public GeminiService(HttpClient httpClient, IConfiguration config, ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task<float[]?> GetEmbeddingAsync(string text, CancellationToken ct = default)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post,
            $"https://generativelanguage.googleapis.com/v1beta/models/{EmbeddingModel}:embedContent");
        request.Headers.Add("x-goog-api-key", ApiKey);
        request.Content = JsonContent.Create(new
        {
            content = new { parts = new[] { new { text } } },
            output_dimensionality = 768
        });

        try
        {
            using var response = await _httpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("Gemini Embedding API returned {Status}: {Error}", response.StatusCode, err);
                return null;
            }

            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            if (!doc.RootElement.TryGetProperty("embedding", out var embeddingObj) ||
                !embeddingObj.TryGetProperty("values", out var valuesArr))
            {
                return null;
            }

            var vector = new float[valuesArr.GetArrayLength()];
            if (vector.Length != 768)
            {
                _logger.LogWarning("Gemini embedding returned {Dimensions} dimensions; expected 768.", vector.Length);
                return null;
            }
            int idx = 0;
            foreach (var val in valuesArr.EnumerateArray())
            {
                vector[idx++] = val.GetSingle();
            }

            return vector;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi Gemini Embedding API.");
            return null;
        }
    }

    public async Task<string> GenerateAnswerAsync(string systemInstruction, string userPrompt, CancellationToken ct = default)
    {
        if (!IsConfigured)
        {
            return "Hệ thống AI chưa được cấu hình Gemini:ApiKey. Vui lòng thiết lập API Key trong cấu hình để kích hoạt trả lời thông minh.";
        }

        var payload = new
        {
            systemInstruction = new
            {
                parts = new[] { new { text = systemInstruction } }
            },
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = userPrompt } }
                }
            },
            generationConfig = new
            {
                temperature = 0.4,
                maxOutputTokens = 1024
            }
        };

        try
        {
            for (var attempt = 0; attempt < 3; attempt++)
            {
                using var retryRequest = new HttpRequestMessage(HttpMethod.Post,
                    $"https://generativelanguage.googleapis.com/v1beta/models/{ChatModel}:generateContent");
                retryRequest.Headers.Add("x-goog-api-key", ApiKey);
                retryRequest.Content = JsonContent.Create(payload);

                using var response = await _httpClient.SendAsync(retryRequest, ct);
                if (response.StatusCode is System.Net.HttpStatusCode.TooManyRequests or System.Net.HttpStatusCode.ServiceUnavailable
                    && attempt < 2)
                {
                    var delay = GetRetryDelay(response, attempt);
                    _logger.LogInformation("Gemini Chat API returned {Status}; retrying in {DelayMs} ms (attempt {Attempt}/3).",
                        response.StatusCode, delay.TotalMilliseconds, attempt + 1);
                    await Task.Delay(delay, ct);
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    var err = await response.Content.ReadAsStringAsync(ct);
                    _logger.LogWarning("Gemini Chat API returned {Status}: {Error}", response.StatusCode, err);
                    return "Xin lỗi, dịch vụ AI đang bận hoặc gặp sự cố kết nối. Bạn vui lòng thử lại sau.";
                }

                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
                if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    var first = candidates[0];
                    if (first.TryGetProperty("content", out var content) &&
                        content.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0 &&
                        parts[0].TryGetProperty("text", out var textProp))
                    {
                        return textProp.GetString() ?? string.Empty;
                    }
                }

                return "Không nhận được phản hồi hợp lệ từ mô hình AI.";
            }

            return "Xin lỗi, dịch vụ AI đang bận hoặc gặp sự cố kết nối. Bạn vui lòng thử lại sau.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi Gemini Chat API.");
            return "Đã xảy ra lỗi khi kết nối với trợ lý AI.";
        }
    }

    private static TimeSpan GetRetryDelay(HttpResponseMessage response, int attempt)
    {
        var requested = response.Headers.RetryAfter?.Delta;
        if (requested is null && response.Headers.RetryAfter?.Date is { } retryDate)
            requested = retryDate - DateTimeOffset.UtcNow;

        var fallback = TimeSpan.FromSeconds(attempt + 1);
        var delay = requested is { } requestedDelay && requestedDelay > TimeSpan.Zero
            ? requestedDelay
            : fallback;

        return delay > TimeSpan.FromSeconds(5) ? TimeSpan.FromSeconds(5) : delay;
    }
}
