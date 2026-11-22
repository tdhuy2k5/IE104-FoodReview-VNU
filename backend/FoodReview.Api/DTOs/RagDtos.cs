using System.ComponentModel.DataAnnotations;

namespace FoodReview.Api.DTOs;

public record ChatRequest(
    [Required][MaxLength(1000)] string Message,
    double? UserLat = null,
    double? UserLng = null
);

public class SemanticPlaceResult
{
    public int PlaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string AreaName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal PriceMin { get; set; }
    public decimal PriceMax { get; set; }
    public double AverageRating { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? DistanceKm { get; set; }
    public string? GoogleMapsUrl { get; set; }
    public double SimilarityScore { get; set; }
    public string MatchedContext { get; set; } = string.Empty;
    public List<string> HighlightReviews { get; set; } = new();
}

public record ChatResponse(
    string Reply,
    List<SemanticPlaceResult> SuggestedPlaces,
    bool IsGeminiConfigured
);

public record RagSyncResult(
    int PlacesSynced,
    int ReviewsSynced,
    int FailedCount,
    string Message
);
