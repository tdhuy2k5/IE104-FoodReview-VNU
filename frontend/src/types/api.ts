export interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}
export interface Paged<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}
export interface Area {
  id: number;
  name: string;
  description?: string;
  parentAreaId?: number;
  placeCount: number;
}
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  placeCount: number;
}
export interface Place {
  id: number;
  name: string;
  slug: string;
  description?: string;
  address: string;
  areaId: number;
  areaName: string;
  categoryId: number;
  categoryName: string;
  priceMin: number;
  priceMax: number;
  openingHours?: string;
  coverImageUrl?: string;
  averageRating: number;
  reviewCount: number;
  status: number;
}
export interface PlaceDetail extends Place {
  latitude?: number | null;
  longitude?: number | null;
  isFavorite: boolean;
  menuItems: { id: number; name: string; price: number; note?: string }[];
  recentReviews: Review[];
}
export interface User {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  createdAt?: string;
  totalReviews?: number;
  totalFavorites?: number;
}
export interface AuthResponse extends User {
  token: string;
}
export interface Review {
  id: number;
  placeId: number;
  placeName: string;
  rating: number;
  content: string;
  status: number;
  author: Pick<User, "id" | "displayName" | "avatarUrl">;
  createdAt: string;
  updatedAt: string;
  images: { id: number; imageUrl: string; altText?: string }[];
}
export interface ReviewInput {
  rating: number;
  content: string;
  imageUrls: string[];
}
export interface Report {
  id: number;
  status: number;
}
