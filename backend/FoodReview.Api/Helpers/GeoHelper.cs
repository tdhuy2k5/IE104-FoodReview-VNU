using System.Globalization;

namespace FoodReview.Api.Helpers;

/// <summary>
/// Các hàm tiện ích xử lý tọa độ GPS, tính khoảng cách Haversine và tạo liên kết Google Maps.
/// </summary>
public static class GeoHelper
{
    private const double EarthRadiusKm = 6371.0;

    /// <summary>
    /// Biểu thức SQL PostgreSQL tính khoảng cách Haversine (đơn vị km) giữa tọa độ người dùng (@UserLat, @UserLng) và quán (p.Latitude, p.Longitude).
    /// </summary>
    public const string SqlHaversineDistanceKm = @"
        CASE 
            WHEN p.Latitude IS NULL OR p.Longitude IS NULL THEN NULL
            ELSE ROUND((6371.0 * acos(LEAST(1.0, GREATEST(-1.0,
                cos(radians(@UserLat)) * cos(radians(p.Latitude)) *
                cos(radians(p.Longitude) - radians(@UserLng)) +
                sin(radians(@UserLat)) * sin(radians(p.Latitude))
            ))))::numeric, 2)::DOUBLE PRECISION
        END";

    /// <summary>
    /// Tính khoảng cách Haversine bằng C# (đơn vị km, làm tròn 2 chữ số thập phân).
    /// </summary>
    public static double? CalculateDistanceKm(double? lat1, double? lng1, double? lat2, double? lng2)
    {
        if (!lat1.HasValue || !lng1.HasValue || !lat2.HasValue || !lng2.HasValue)
            return null;

        var dLat = ToRadians(lat2.Value - lat1.Value);
        var dLng = ToRadians(lng2.Value - lng1.Value);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1.Value)) * Math.Cos(ToRadians(lat2.Value)) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return Math.Round(EarthRadiusKm * c, 2);
    }

    /// <summary>
    /// Tạo Google Maps Universal URL để mở trực tiếp trên trình duyệt hoặc ứng dụng Google Maps.
    /// </summary>
    public static string? BuildGoogleMapsUrl(double? latitude, double? longitude, string? placeName = null)
    {
        if (!latitude.HasValue || !longitude.HasValue)
            return null;

        var latStr = latitude.Value.ToString(CultureInfo.InvariantCulture);
        var lngStr = longitude.Value.ToString(CultureInfo.InvariantCulture);

        return $"https://www.google.com/maps/search/?api=1&query={latStr},{lngStr}";
    }

    private static double ToRadians(double deg) => deg * (Math.PI / 180.0);
}
