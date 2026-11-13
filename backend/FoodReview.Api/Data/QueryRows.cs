using FoodReview.Api.Models;

namespace FoodReview.Api.Data;

// Các lớp trung gian cho Dapper khi cần đọc dữ liệu từ nhiều bảng.
// Dùng typed mapping thay vì dynamic để tránh lỗi PostgreSQL trả tên cột chữ thường.

internal sealed class ReviewRow
{
    public int Id { get; set; }
    public int PlaceId { get; set; }
    public string PlaceName { get; set; } = string.Empty;
    public int AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorAvatar { get; set; }
    public int UserId { get; set; }
    public int Rating { get; set; }
    public string Content { get; set; } = string.Empty;
    public ReviewStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

internal sealed class PlaceStatusRow
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public PlaceStatus Status { get; set; }
}

internal sealed class ReportRow
{
    public int Id { get; set; }
    public int ReviewId { get; set; }
    public string ReviewContent { get; set; } = string.Empty;
    public int ReviewAuthorId { get; set; }
    public string ReviewAuthorName { get; set; } = string.Empty;
    public int ReporterId { get; set; }
    public string ReporterName { get; set; } = string.Empty;
    public ReportReason Reason { get; set; }
    public string? Description { get; set; }
    public ReportStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? HandledAt { get; set; }
    public string? HandledByName { get; set; }
}

internal sealed class AdminUserRow
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int TotalReviews { get; set; }
    public int TotalFavorites { get; set; }
}
