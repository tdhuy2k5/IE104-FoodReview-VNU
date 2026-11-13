using Dapper;
using FoodReview.Api.Data;
using FoodReview.Api.DTOs;
using FoodReview.Api.Models;

namespace FoodReview.Api.Services;

public class AdminService : IAdminService
{
    private readonly IDbConnectionFactory _dbFactory;

    public AdminService(IDbConnectionFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<List<ReportDto>> GetReportsAsync(ReportStatus? status = null)
    {
        using var conn = _dbFactory.CreateConnection();

        var sql = @"
            SELECT 
                rep.Id, rep.ReviewId, r.Content AS ReviewContent,
                r.UserId AS ReviewAuthorId, uAuthor.DisplayName AS ReviewAuthorName,
                rep.ReporterId, uReporter.DisplayName AS ReporterName,
                rep.Reason, rep.Description, rep.Status, rep.CreatedAt, rep.HandledAt,
                uAdmin.DisplayName AS HandledByName
            FROM Reports rep
            JOIN Reviews r ON rep.ReviewId = r.Id
            JOIN Users uAuthor ON r.UserId = uAuthor.Id
            JOIN Users uReporter ON rep.ReporterId = uReporter.Id
            LEFT JOIN Users uAdmin ON rep.HandledBy = uAdmin.Id
            WHERE (@Status IS NULL OR rep.Status = @Status)
            ORDER BY rep.CreatedAt DESC";

        var rows = await conn.QueryAsync<ReportRow>(sql, new { Status = status.HasValue ? (int)status.Value : (int?)null });
        var list = new List<ReportDto>();

        foreach (var row in rows)
        {
            list.Add(new ReportDto(
                row.Id,
                row.ReviewId,
                row.ReviewContent,
                row.ReviewAuthorId,
                row.ReviewAuthorName,
                row.ReporterId,
                row.ReporterName,
                row.Reason,
                row.Description,
                row.Status,
                row.CreatedAt,
                row.HandledAt,
                row.HandledByName
            ));
        }

        return list;
    }

    public async Task<bool> ResolveReportAsync(int reportId, int adminId, ResolveReportRequest request)
    {
        using var conn = _dbFactory.CreateConnection();

        var updateSql = @"
            UPDATE Reports
            SET Status = @Status,
                HandledBy = @AdminId,
                HandledAt = CURRENT_TIMESTAMP
            WHERE Id = @Id";

        var rows = await conn.ExecuteAsync(updateSql, new
        {
            Id = reportId,
            Status = (int)request.Status,
            AdminId = adminId
        });

        if (rows == 0) return false;

        if (request.HideReview)
        {
            await conn.ExecuteAsync(@"
                UPDATE Reviews 
                SET Status = 2, UpdatedAt = CURRENT_TIMESTAMP 
                WHERE Id = (SELECT ReviewId FROM Reports WHERE Id = @Id)",
                new { Id = reportId });
        }

        return true;
    }

    public async Task<List<UserProfileDto>> GetAllUsersAsync()
    {
        using var conn = _dbFactory.CreateConnection();

        var sql = @"
            SELECT 
                u.Id, u.Email, u.DisplayName, u.AvatarUrl,
                CASE WHEN u.Role = 1 THEN 'Admin' ELSE 'User' END AS Role,
                u.CreatedAt,
                (SELECT COUNT(1) FROM Reviews r WHERE r.UserId = u.Id) AS TotalReviews,
                (SELECT COUNT(1) FROM Favorites f WHERE f.UserId = u.Id) AS TotalFavorites
            FROM Users u
            ORDER BY u.CreatedAt DESC";

        var rows = await conn.QueryAsync<AdminUserRow>(sql);
        var list = new List<UserProfileDto>();

        foreach (var u in rows)
        {
            list.Add(new UserProfileDto(
                u.Id,
                u.Email,
                u.DisplayName,
                u.AvatarUrl,
                u.Role,
                u.CreatedAt,
                u.TotalReviews,
                u.TotalFavorites
            ));
        }

        return list;
    }

    public async Task<bool> ToggleUserBanStatusAsync(int userId)
    {
        using var conn = _dbFactory.CreateConnection();

        var currentStatus = await conn.ExecuteScalarAsync<int?>("SELECT Status FROM Users WHERE Id = @Id", new { Id = userId });
        if (!currentStatus.HasValue) return false;

        var newStatus = currentStatus.Value == 0 ? 1 : 0;
        await conn.ExecuteAsync("UPDATE Users SET Status = @Status WHERE Id = @Id", new { Id = userId, Status = newStatus });
        return true;
    }

    public async Task<List<PlaceSummaryDto>> GetAllPlacesForAdminAsync()
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
            FROM Places p
            JOIN Areas a ON p.AreaId = a.Id
            JOIN Categories c ON p.CategoryId = c.Id
            LEFT JOIN Reviews r ON r.PlaceId = p.Id
            GROUP BY p.Id, a.Name, c.Name
            ORDER BY p.UpdatedAt DESC";

        var list = await conn.QueryAsync<PlaceSummaryDto>(sql);
        return list.AsList();
    }

    public async Task<bool> ToggleReviewVisibilityAsync(int reviewId, ReviewStatus newStatus)
    {
        using var conn = _dbFactory.CreateConnection();

        var rows = await conn.ExecuteAsync(
            "UPDATE Reviews SET Status = @Status, UpdatedAt = CURRENT_TIMESTAMP WHERE Id = @Id",
            new { Id = reviewId, Status = (int)newStatus });

        return rows > 0;
    }
}
