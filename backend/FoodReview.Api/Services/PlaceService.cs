using System.Text;
using System.Text.RegularExpressions;
using Dapper;
using FoodReview.Api.Data;
using FoodReview.Api.DTOs;
using FoodReview.Api.Models;

namespace FoodReview.Api.Services;

public class PlaceService : IPlaceService
{
    private readonly IDbConnectionFactory _dbFactory;

    public PlaceService(IDbConnectionFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<PagedResult<PlaceSummaryDto>> GetPlacesAsync(PlaceFilterParams filter)
    {
        using var conn = _dbFactory.CreateConnection();

        var whereClauses = new List<string> { "p.Status = 1" };
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            whereClauses.Add(@"(p.Name ILIKE @Search 
                               OR p.Description ILIKE @Search 
                               OR p.Address ILIKE @Search 
                               OR EXISTS (SELECT 1 FROM MenuItems m WHERE m.PlaceId = p.Id AND m.Name ILIKE @Search))");
            parameters.Add("Search", $"%{filter.Search.Trim()}%");
        }

        if (filter.AreaId.HasValue && filter.AreaId.Value > 0)
        {
            whereClauses.Add("(p.AreaId = @AreaId OR a.ParentAreaId = @AreaId)");
            parameters.Add("AreaId", filter.AreaId.Value);
        }

        if (filter.CategoryId.HasValue && filter.CategoryId.Value > 0)
        {
            whereClauses.Add("p.CategoryId = @CategoryId");
            parameters.Add("CategoryId", filter.CategoryId.Value);
        }

        if (filter.MinPrice.HasValue)
        {
            whereClauses.Add("p.PriceMax >= @MinPrice");
            parameters.Add("MinPrice", filter.MinPrice.Value);
        }

        if (filter.MaxPrice.HasValue)
        {
            whereClauses.Add("p.PriceMin <= @MaxPrice");
            parameters.Add("MaxPrice", filter.MaxPrice.Value);
        }

        var whereSql = string.Join(" AND ", whereClauses);

        var countSql = $@"
            SELECT COUNT(1) 
            FROM Places p
            JOIN Areas a ON p.AreaId = a.Id
            WHERE {whereSql}";

        var totalCount = await conn.ExecuteScalarAsync<int>(countSql, parameters);

        var orderBySql = filter.SortBy switch
        {
            "rating" => "AverageRating DESC, ReviewCount DESC",
            "price_asc" => "p.PriceMin ASC",
            "price_desc" => "p.PriceMax DESC",
            "newest" => "p.CreatedAt DESC",
            _ => "ReviewCount DESC, AverageRating DESC"
        };

        var havingSql = filter.MinRating.HasValue
            ? "HAVING COALESCE(AVG(CASE WHEN r.Status = 1 THEN r.Rating END), 0.0) >= @MinRating"
            : string.Empty;

        var querySql = $@"
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
            WHERE {whereSql}
            GROUP BY p.Id, a.Name, c.Name
            {havingSql}
            ORDER BY {orderBySql}
            LIMIT @PageSize OFFSET @Offset";

        if (filter.MinRating.HasValue)
        {
            parameters.Add("MinRating", filter.MinRating.Value);
        }
        parameters.Add("PageSize", filter.PageSize);
        parameters.Add("Offset", (filter.PageIndex - 1) * filter.PageSize);

        var items = (await conn.QueryAsync<PlaceSummaryDto>(querySql, parameters)).AsList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)filter.PageSize);

        return new PagedResult<PlaceSummaryDto>(items, totalCount, filter.PageIndex, filter.PageSize, totalPages);
    }

    public async Task<PlaceDetailDto?> GetPlaceDetailAsync(int id, int? currentUserId = null)
    {
        using var conn = _dbFactory.CreateConnection();

        var placeSql = @"
            SELECT 
                p.Id, p.Name, p.Slug, p.Description, p.Address,
                p.AreaId, a.Name AS AreaName,
                p.CategoryId, c.Name AS CategoryName,
                p.PriceMin, p.PriceMax, p.OpeningHours, p.Latitude, p.Longitude, p.CoverImageUrl,
                COALESCE(ROUND(AVG(CASE WHEN r.Status = 1 THEN r.Rating END), 1), 0.0)::DOUBLE PRECISION AS AverageRating,
                COUNT(CASE WHEN r.Status = 1 THEN 1 END) AS ReviewCount,
                p.Status, p.CreatedAt, p.UpdatedAt
            FROM Places p
            JOIN Areas a ON p.AreaId = a.Id
            JOIN Categories c ON p.CategoryId = c.Id
            LEFT JOIN Reviews r ON r.PlaceId = p.Id
            WHERE p.Id = @Id
            GROUP BY p.Id, a.Name, c.Name";

        var place = await conn.QueryFirstOrDefaultAsync<PlaceDetailDto>(placeSql, new { Id = id });
        if (place == null) return null;

        place.MenuItems = (await conn.QueryAsync<MenuItemDto>(
            "SELECT Id, Name, Price, Note FROM MenuItems WHERE PlaceId = @Id", new { Id = id })).AsList();

        place.RecentReviews = await GetReviewsForPlaceAsync(conn, id);

        if (currentUserId.HasValue)
        {
            place.IsFavorite = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM Favorites WHERE UserId = @UserId AND PlaceId = @PlaceId",
                new { UserId = currentUserId.Value, PlaceId = id }) > 0;
        }

        return place;
    }

    public async Task<PlaceDetailDto?> GetPlaceDetailBySlugAsync(string slug, int? currentUserId = null)
    {
        using var conn = _dbFactory.CreateConnection();

        var id = await conn.ExecuteScalarAsync<int?>(
            "SELECT Id FROM Places WHERE LOWER(Slug) = LOWER(@Slug)", new { Slug = slug.Trim() });

        if (!id.HasValue) return null;

        return await GetPlaceDetailAsync(id.Value, currentUserId);
    }

    public async Task<PlaceDetailDto> CreatePlaceAsync(CreatePlaceRequest request)
    {
        using var conn = _dbFactory.CreateConnection();

        var slug = GenerateSlug(request.Name);
        var originalSlug = slug;
        int count = 1;
        while (await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM Places WHERE Slug = @Slug", new { Slug = slug }) > 0)
        {
            slug = $"{originalSlug}-{count++}";
        }

        var insertSql = @"
            INSERT INTO Places (Name, Slug, Description, Address, AreaId, CategoryId, PriceMin, PriceMax, OpeningHours, Latitude, Longitude, CoverImageUrl, Status)
            VALUES (@Name, @Slug, @Description, @Address, @AreaId, @CategoryId, @PriceMin, @PriceMax, @OpeningHours, @Latitude, @Longitude, @CoverImageUrl, 1)
            RETURNING Id;";

        var placeId = await conn.ExecuteScalarAsync<int>(insertSql, new
        {
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description?.Trim(),
            Address = request.Address.Trim(),
            request.AreaId,
            request.CategoryId,
            request.PriceMin,
            request.PriceMax,
            OpeningHours = string.IsNullOrWhiteSpace(request.OpeningHours) ? "07:00 - 21:00" : request.OpeningHours.Trim(),
            request.Latitude,
            request.Longitude,
            request.CoverImageUrl
        });

        if (request.MenuItems != null && request.MenuItems.Count > 0)
        {
            var insertMenuSql = "INSERT INTO MenuItems (PlaceId, Name, Price, Note) VALUES (@PlaceId, @Name, @Price, @Note)";
            foreach (var item in request.MenuItems)
            {
                await conn.ExecuteAsync(insertMenuSql, new
                {
                    PlaceId = placeId,
                    Name = item.Name.Trim(),
                    item.Price,
                    Note = item.Note?.Trim()
                });
            }
        }

        return (await GetPlaceDetailAsync(placeId))!;
    }

    public async Task<PlaceDetailDto> UpdatePlaceAsync(int id, UpdatePlaceRequest request)
    {
        using var conn = _dbFactory.CreateConnection();

        var updateSql = @"
            UPDATE Places
            SET Name = @Name,
                Description = @Description,
                Address = @Address,
                AreaId = @AreaId,
                CategoryId = @CategoryId,
                PriceMin = @PriceMin,
                PriceMax = @PriceMax,
                OpeningHours = @OpeningHours,
                Latitude = @Latitude,
                Longitude = @Longitude,
                CoverImageUrl = COALESCE(@CoverImageUrl, CoverImageUrl),
                Status = @Status,
                UpdatedAt = CURRENT_TIMESTAMP
            WHERE Id = @Id";

        var rows = await conn.ExecuteAsync(updateSql, new
        {
            Id = id,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Address = request.Address.Trim(),
            request.AreaId,
            request.CategoryId,
            request.PriceMin,
            request.PriceMax,
            OpeningHours = string.IsNullOrWhiteSpace(request.OpeningHours) ? "07:00 - 21:00" : request.OpeningHours.Trim(),
            request.Latitude,
            request.Longitude,
            request.CoverImageUrl,
            Status = (int)request.Status
        });

        if (rows == 0)
        {
            throw new KeyNotFoundException("Không tìm thấy địa điểm.");
        }

        if (request.MenuItems != null)
        {
            await conn.ExecuteAsync("DELETE FROM MenuItems WHERE PlaceId = @Id", new { Id = id });
            var insertMenuSql = "INSERT INTO MenuItems (PlaceId, Name, Price, Note) VALUES (@PlaceId, @Name, @Price, @Note)";
            foreach (var item in request.MenuItems)
            {
                await conn.ExecuteAsync(insertMenuSql, new
                {
                    PlaceId = id,
                    Name = item.Name.Trim(),
                    item.Price,
                    Note = item.Note?.Trim()
                });
            }
        }

        return (await GetPlaceDetailAsync(id))!;
    }

    public async Task<bool> DeletePlaceAsync(int id)
    {
        using var conn = _dbFactory.CreateConnection();
        var rows = await conn.ExecuteAsync("UPDATE Places SET Status = 2, UpdatedAt = CURRENT_TIMESTAMP WHERE Id = @Id", new { Id = id });
        return rows > 0;
    }

    private static async Task<List<ReviewDto>> GetReviewsForPlaceAsync(System.Data.IDbConnection conn, int placeId)
    {
        var sql = @"
            SELECT 
                r.Id, r.PlaceId, p.Name AS PlaceName,
                u.Id AS AuthorId, u.DisplayName AS AuthorName, u.AvatarUrl AS AuthorAvatar,
                r.Rating, r.Content, r.Status, r.CreatedAt, r.UpdatedAt
            FROM Reviews r
            JOIN Users u ON r.UserId = u.Id
            JOIN Places p ON r.PlaceId = p.Id
            WHERE r.PlaceId = @PlaceId AND r.Status = 1
            ORDER BY r.CreatedAt DESC";

        var reviewRows = await conn.QueryAsync<ReviewRow>(sql, new { PlaceId = placeId });
        var list = new List<ReviewDto>();

        foreach (var row in reviewRows)
        {
            var images = (await conn.QueryAsync<ReviewImageDto>(
                "SELECT Id, ImageUrl, AltText FROM ReviewImages WHERE ReviewId = @ReviewId",
                new { ReviewId = row.Id })).AsList();

            list.Add(new ReviewDto(
                row.Id,
                row.PlaceId,
                row.PlaceName,
                new ReviewAuthorDto(row.AuthorId, row.AuthorName, row.AuthorAvatar),
                row.Rating,
                row.Content,
                row.Status,
                row.CreatedAt,
                row.UpdatedAt,
                images
            ));
        }

        return list;
    }

    private static string GenerateSlug(string phrase)
    {
        string str = phrase.ToLowerInvariant();
        string[] vietnameseSigns = [
            "aAeEoOuUiIdDyY",
            "áàạảãâấầậẩẫăắằặẳẵ",
            "ÁÀẠẢÃÂẤẦẬẨẪĂẮẰẶẲẴ",
            "éèẹẻẽêếềệểễ",
            "ÉÈẸẺẼÊẾỀỆỂỄ",
            "óòọỏõôốồộổỗơớờợởỡ",
            "ÓÒỌỎÕÔỐỒỘỔỖƠỚỜỢỞỠ",
            "úùụủũưứừựửữ",
            "ÚÙỤỦŨƯỨỪỰỬỮ",
            "íìịỉĩ",
            "ÍÌỊỈĨ",
            "đ",
            "Đ",
            "ýỳỵỷỹ",
            "ÝỲỴỶỸ"
        ];
        for (int i = 1; i < vietnameseSigns.Length; i++)
        {
            for (int j = 0; j < vietnameseSigns[i].Length; j++)
                str = str.Replace(vietnameseSigns[i][j], vietnameseSigns[0][i - 1]);
        }

        str = Regex.Replace(str, @"[^a-z0-9\s-]", "");
        str = Regex.Replace(str, @"\s+", " ").Trim();
        str = str.Substring(0, str.Length <= 100 ? str.Length : 100).Trim();
        str = Regex.Replace(str, @"\s", "-");
        return str;
    }
}
