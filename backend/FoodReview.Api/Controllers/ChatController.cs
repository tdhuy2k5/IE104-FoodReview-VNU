using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using FoodReview.Api.DTOs;
using FoodReview.Api.Services;

namespace FoodReview.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IRagService _ragService;

    public ChatController(IRagService ragService)
    {
        _ragService = ragService;
    }

    /// <summary>
    /// Trò chuyện với Trợ lý Ẩm thực AI (RAG + Khoảng cách GPS + Google Maps URL)
    /// </summary>
    [EnableRateLimiting("ChatPolicy")]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ChatResponse>>> Ask([FromBody] ChatRequest request, CancellationToken ct)
    {
        var result = await _ragService.AskAsync(request, ct);
        return Ok(new ApiResponse<ChatResponse>(true, "Phản hồi từ trợ lý AI thành công.", result));
    }

    /// <summary>
    /// Tìm kiếm ngữ nghĩa trực tiếp trên Vector Database (pgvector)
    /// </summary>
    [EnableRateLimiting("ChatPolicy")]
    [HttpGet("search")]
    public async Task<ActionResult<ApiResponse<List<SemanticPlaceResult>>>> SemanticSearch(
        [FromQuery] string q,
        [FromQuery] double? userLat = null,
        [FromQuery] double? userLng = null,
        [FromQuery] int topK = 5,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest(new ApiResponse<List<SemanticPlaceResult>>(false, "Vui lòng nhập từ khóa hoặc câu mô tả nhu cầu."));
        }

        var results = await _ragService.SearchSemanticAsync(q, userLat, userLng, Math.Clamp(topK, 1, 20), ct);
        return Ok(new ApiResponse<List<SemanticPlaceResult>>(true, "Tìm kiếm ngữ nghĩa thành công.", results));
    }

    /// <summary>
    /// [Admin] Đồng bộ Vector Embedding cho toàn bộ quán ăn và đánh giá chưa có vector hoặc mới cập nhật
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("sync")]
    public async Task<ActionResult<ApiResponse<RagSyncResult>>> SyncEmbeddings(CancellationToken ct)
    {
        var result = await _ragService.SyncAllMissingAsync(ct);
        return Ok(new ApiResponse<RagSyncResult>(true, result.Message, result));
    }
}
