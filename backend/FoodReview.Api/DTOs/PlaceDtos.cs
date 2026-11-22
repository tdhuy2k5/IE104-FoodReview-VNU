using System.ComponentModel.DataAnnotations;
using FoodReview.Api.Models;

namespace FoodReview.Api.DTOs;

public class MenuItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Note { get; set; }

    public MenuItemDto() { }
    public MenuItemDto(int id, string name, decimal price, string? note)
    {
        Id = id; Name = name; Price = price; Note = note;
    }
}

public record CreateMenuItemRequest(
    [Required][MaxLength(150)] string Name,
    [Range(0, 100000000)] decimal Price,
    string? Note
);

public class PlaceSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Address { get; set; } = string.Empty;
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal PriceMin { get; set; }
    public decimal PriceMax { get; set; }
    public string OpeningHours { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public PlaceStatus Status { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? DistanceKm { get; set; }
    public string? GoogleMapsUrl { get; set; }

    public PlaceSummaryDto() { }
    public PlaceSummaryDto(int id, string name, string slug, string? description, string address, int areaId, string areaName, int categoryId, string categoryName, decimal priceMin, decimal priceMax, string openingHours, string? coverImageUrl, double averageRating, int reviewCount, PlaceStatus status)
    {
        Id = id; Name = name; Slug = slug; Description = description; Address = address;
        AreaId = areaId; AreaName = areaName; CategoryId = categoryId; CategoryName = categoryName;
        PriceMin = priceMin; PriceMax = priceMax; OpeningHours = openingHours; CoverImageUrl = coverImageUrl;
        AverageRating = averageRating; ReviewCount = reviewCount; Status = status;
    }
}

public class PlaceDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Address { get; set; } = string.Empty;
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal PriceMin { get; set; }
    public decimal PriceMax { get; set; }
    public string OpeningHours { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? CoverImageUrl { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public PlaceStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<MenuItemDto> MenuItems { get; set; } = new();
    public List<ReviewDto> RecentReviews { get; set; } = new();
    public bool IsFavorite { get; set; }
    public double? DistanceKm { get; set; }
    public string? GoogleMapsUrl { get; set; }

    public PlaceDetailDto() { }
    public PlaceDetailDto(int id, string name, string slug, string? description, string address, int areaId, string areaName, int categoryId, string categoryName, decimal priceMin, decimal priceMax, string openingHours, double? latitude, double? longitude, string? coverImageUrl, double averageRating, int reviewCount, PlaceStatus status, DateTime createdAt, DateTime updatedAt, List<MenuItemDto> menuItems, List<ReviewDto> recentReviews, bool isFavorite)
    {
        Id = id; Name = name; Slug = slug; Description = description; Address = address;
        AreaId = areaId; AreaName = areaName; CategoryId = categoryId; CategoryName = categoryName;
        PriceMin = priceMin; PriceMax = priceMax; OpeningHours = openingHours; Latitude = latitude;
        Longitude = longitude; CoverImageUrl = coverImageUrl; AverageRating = averageRating;
        ReviewCount = reviewCount; Status = status; CreatedAt = createdAt; UpdatedAt = updatedAt;
        MenuItems = menuItems; RecentReviews = recentReviews; IsFavorite = isFavorite;
    }
}

public record PlaceFilterParams(
    string? Search,
    int? AreaId,
    int? CategoryId,
    decimal? MinPrice,
    decimal? MaxPrice,
    double? MinRating,
    string? SortBy,
    int PageIndex = 1,
    int PageSize = 10,
    double? UserLat = null,
    double? UserLng = null,
    double? RadiusKm = null
);

public record CreatePlaceRequest(
    [Required][MaxLength(200)] string Name,
    string? Description,
    [Required][MaxLength(300)] string Address,
    [Required] int AreaId,
    [Required] int CategoryId,
    [Range(0, 100000000)] decimal PriceMin,
    [Range(0, 100000000)] decimal PriceMax,
    string? OpeningHours,
    double? Latitude,
    double? Longitude,
    string? CoverImageUrl,
    List<CreateMenuItemRequest>? MenuItems
);

public record UpdatePlaceRequest(
    [Required][MaxLength(200)] string Name,
    string? Description,
    [Required][MaxLength(300)] string Address,
    [Required] int AreaId,
    [Required] int CategoryId,
    [Range(0, 100000000)] decimal PriceMin,
    [Range(0, 100000000)] decimal PriceMax,
    string? OpeningHours,
    double? Latitude,
    double? Longitude,
    string? CoverImageUrl,
    PlaceStatus Status,
    List<CreateMenuItemRequest>? MenuItems
);
