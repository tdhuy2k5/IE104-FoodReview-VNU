using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FoodReview.Api.DTOs;
using FoodReview.Api.Services;

namespace FoodReview.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlacesController : ControllerBase
{
    private readonly IPlaceService _placeService;
    private readonly IInteractionService _interactionService;

    public PlacesController(IPlaceService placeService, IInteractionService interactionService)
    {
        _placeService = placeService;
        _interactionService = interactionService;
    }

    /// <summary>
    /// Tìm kiếm và lọc danh sách quán ăn theo từ khóa, khu vực, danh mục, giá tiền, rating, sắp xếp và phân trang
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<PlaceSummaryDto>>>> GetPlaces([FromQuery] PlaceFilterParams filter)
    {
        var result = await _placeService.GetPlacesAsync(filter);
        return Ok(new ApiResponse<PagedResult<PlaceSummaryDto>>(true, "Lấy danh sách địa điểm thành công.", result));
    }

    /// <summary>
    /// Xem chi tiết quán ăn theo ID (kèm menu, danh sách review, trạng thái yêu thích, khoảng cách và link Google Maps)
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<PlaceDetailDto>>> GetById(
        int id, [FromQuery] double? userLat = null, [FromQuery] double? userLng = null)
    {
        int? userId = null;
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(userIdStr, out var parsed)) userId = parsed;

        var place = await _placeService.GetPlaceDetailAsync(id, userId, userLat, userLng);
        if (place == null)
        {
            return NotFound(new ApiResponse<PlaceDetailDto>(false, "Không tìm thấy địa điểm quán ăn."));
        }

        return Ok(new ApiResponse<PlaceDetailDto>(true, "Lấy chi tiết địa điểm thành công.", place));
    }

    /// <summary>
    /// Xem chi tiết quán ăn theo URL Slug (ví dụ: com-tam-cay-bang)
    /// </summary>
    [HttpGet("slug/{slug}")]
    public async Task<ActionResult<ApiResponse<PlaceDetailDto>>> GetBySlug(
        string slug, [FromQuery] double? userLat = null, [FromQuery] double? userLng = null)
    {
        int? userId = null;
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(userIdStr, out var parsed)) userId = parsed;

        var place = await _placeService.GetPlaceDetailBySlugAsync(slug, userId, userLat, userLng);
        if (place == null)
        {
            return NotFound(new ApiResponse<PlaceDetailDto>(false, "Không tìm thấy địa điểm quán ăn."));
        }

        return Ok(new ApiResponse<PlaceDetailDto>(true, "Lấy chi tiết địa điểm thành công.", place));
    }

    /// <summary>
    /// [Admin] Tạo mới địa điểm quán ăn kèm danh sách món ăn ban đầu
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<PlaceDetailDto>>> Create([FromBody] CreatePlaceRequest request)
    {
        var place = await _placeService.CreatePlaceAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = place.Id }, new ApiResponse<PlaceDetailDto>(true, "Tạo địa điểm thành công.", place));
    }

    /// <summary>
    /// [Admin] Cập nhật thông tin quán ăn và danh sách thực đơn
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<PlaceDetailDto>>> Update(int id, [FromBody] UpdatePlaceRequest request)
    {
        try
        {
            var place = await _placeService.UpdatePlaceAsync(id, request);
            return Ok(new ApiResponse<PlaceDetailDto>(true, "Cập nhật địa điểm thành công.", place));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ApiResponse<PlaceDetailDto>(false, ex.Message));
        }
    }

    /// <summary>
    /// [Admin] Xóa mềm quán ăn (Chuyển trạng thái sang Hidden)
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
    {
        var success = await _placeService.DeletePlaceAsync(id);
        if (!success)
        {
            return NotFound(new ApiResponse<bool>(false, "Không tìm thấy địa điểm để xóa/ẩn."));
        }
        return Ok(new ApiResponse<bool>(true, "Đã ẩn địa điểm thành công.", true));
    }

    [Authorize]
    [HttpPost("{id:int}/favorite")]
    public async Task<ActionResult<ApiResponse<object>>> ToggleFavorite(int id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized(new ApiResponse<object>(false, "Vui lòng đăng nhập lại."));
        }

        try
        {
            var isAdded = await _interactionService.ToggleFavoriteAsync(userId, id);
            var msg = isAdded ? "Đã lưu vào danh sách quán yêu thích." : "Đã bỏ lưu khỏi danh sách yêu thích.";
            return Ok(new ApiResponse<object>(true, msg, new { isFavorite = isAdded }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ApiResponse<object>(false, ex.Message));
        }
    }
}

