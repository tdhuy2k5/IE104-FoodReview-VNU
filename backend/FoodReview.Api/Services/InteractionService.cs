using Dapper;
using FoodReview.Api.Data;
using FoodReview.Api.DTOs;
using FoodReview.Api.Models;

namespace FoodReview.Api.Services;

public class InteractionService : IInteractionService
{
    private readonly IDbConnectionFactory _dbFactory;

    public InteractionService(IDbConnectionFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<bool> ToggleFavoriteAsync(int userId, int placeId)
    {
        using var conn = _dbFactory.CreateConnection();

        var existingCount = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM Favorites WHERE UserId = @UserId AND PlaceId = @PlaceId",
            new { UserId = userId, PlaceId = placeId });

        if (existingCount > 0)
        {
            await conn.ExecuteAsync(
                "DELETE FROM Favorites WHERE UserId = @UserId AND PlaceId = @PlaceId",
                new { UserId = userId, PlaceId = placeId });
            return false;
        }

        var placeExists = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM Places WHERE Id = @Id AND Status != 2", new { Id = placeId }) > 0;

        if (!placeExists)
        {
            throw new KeyNotFoundException("Địa điểm không tồn tại.");
        }

        await conn.ExecuteAsync(
            "INSERT INTO Favorites (UserId, PlaceId) VALUES (@UserId, @PlaceId)",
            new { UserId = userId, PlaceId = placeId });

        return true;
    }

    public async Task<List<PlaceSummaryDto>> GetUserFavoritesAsync(int userId)
    {
        using var conn = _dbFactory.CreateConnection();

        var sql = @"
            SELECT 
                p.Id, p.Name, p.Slug, p.Description, p.Address,
                p.AreaId, a.Name AS AreaName,
                p.CategoryId, c.Name AS CategoryName,
                p.PriceMin, p.PriceMax, p.OpeningHours, p.CoverImageUrl,
                COALESCE(ROUND(AVG(CASE WHEN r.Status = 1 THEN r.Rating END), 1), 0.0)::DOUBLE PRECISION AS AverageRating,
                COUNT(CASE WHEN r.Status = 1 THEN 1 END) AS ReviewCount,
                p.Status
            FROM Favorites f
            JOIN Places p ON f.PlaceId = p.Id
            JOIN Areas a ON p.AreaId = a.Id
            JOIN Categories c ON p.CategoryId = c.Id
            LEFT JOIN Reviews r ON r.PlaceId = p.Id
            WHERE f.UserId = @UserId AND p.Status = 1
            GROUP BY p.Id, a.Name, c.Name, f.CreatedAt
            ORDER BY f.CreatedAt DESC";

        var list = await conn.QueryAsync<PlaceSummaryDto>(sql, new { UserId = userId });
        return list.AsList();
    }

    public async Task<ReportDto> ReportReviewAsync(int userId, CreateReportRequest request)
    {
        using var conn = _dbFactory.CreateConnection();

        var review = await conn.QueryFirstOrDefaultAsync<ReviewRow>(
            "SELECT r.Id, r.Content, r.UserId, u.DisplayName AS AuthorName FROM Reviews r JOIN Users u ON r.UserId = u.Id WHERE r.Id = @Id",
            new { Id = request.ReviewId });

        if (review == null)
        {
            throw new KeyNotFoundException("Không tìm thấy đánh giá cần báo cáo.");
        }

        var reporter = await conn.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM Users WHERE Id = @Id", new { Id = userId });

        if (reporter == null)
        {
            throw new UnauthorizedAccessException("Người dùng không hợp lệ.");
        }

        var alreadyReported = await conn.ExecuteScalarAsync<int>(@"
            SELECT COUNT(1) FROM Reports 
            WHERE ReporterId = @ReporterId AND ReviewId = @ReviewId AND Status = 0",
            new { ReporterId = userId, ReviewId = request.ReviewId }) > 0;

        if (alreadyReported)
        {
            throw new InvalidOperationException("Bạn đã gửi báo cáo cho đánh giá này và đang chờ quản trị viên xử lý.");
        }

        var insertSql = @"
            INSERT INTO Reports (ReporterId, ReviewId, Reason, Description, Status)
            VALUES (@ReporterId, @ReviewId, @Reason, @Description, 0)
            RETURNING Id;";

        var reportId = await conn.ExecuteScalarAsync<int>(insertSql, new
        {
            ReporterId = userId,
            ReviewId = request.ReviewId,
            Reason = (int)request.Reason,
            Description = request.Description?.Trim()
        });

        return new ReportDto(
            reportId,
            review.Id,
            review.Content,
            review.UserId,
            review.AuthorName,
            reporter.Id,
            reporter.DisplayName,
            request.Reason,
            request.Description?.Trim(),
            ReportStatus.Pending,
            DateTime.UtcNow,
            null,
            null
        );
    }
}
