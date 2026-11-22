import { json, query, request } from "./http";
import type {
  Area,
  AuthResponse,
  Category,
  ChatResponse,
  Paged,
  Place,
  PlaceDetail,
  Report,
  Review,
  ReviewInput,
  User,
} from "../types/api";

export const api = {
  areas: (signal?: AbortSignal) => request<Area[]>("/areas", { signal }),
  categories: (signal?: AbortSignal) =>
    request<Category[]>("/categories", { signal }),
  places: (
    params: Record<string, string | number | undefined>,
    signal?: AbortSignal,
  ) => request<Paged<Place>>(`/places?${query(params)}`, { signal }),
  chat: (message: string, userLat?: number, userLng?: number) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: json({ message, userLat, userLng }),
    }),
  place: (slug: string, signal?: AbortSignal) =>
    request<PlaceDetail>(`/places/slug/${encodeURIComponent(slug)}`, {
      signal,
    }),
  reviews: (placeId: number, page: number, signal?: AbortSignal) =>
    request<Paged<Review>>(
      `/reviews/place/${placeId}?page=${page}&pageSize=5`,
      { signal },
    ),
  myReviews: (page: number, signal?: AbortSignal) =>
    request<Paged<Review>>(`/reviews/my?page=${page}&pageSize=5`, { signal }),
  createReview: (placeId: number, body: ReviewInput) =>
    request<Review>(`/reviews/place/${placeId}`, {
      method: "POST",
      body: json(body),
    }),
  updateReview: (id: number, body: ReviewInput) =>
    request<Review>(`/reviews/${id}`, { method: "PUT", body: json(body) }),
  deleteReview: (id: number) =>
    request<boolean>(`/reviews/${id}`, { method: "DELETE" }),
  report: (id: number, reason: number, description: string) =>
    request<Report>(`/reviews/${id}/report`, {
      method: "POST",
      body: json({ reviewId: id, reason, description }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: json({ email, password }),
    }),
  register: (email: string, password: string, displayName: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: json({ email, password, displayName }),
    }),
  me: (signal?: AbortSignal) => request<User>("/auth/me", { signal }),
  profile: (displayName: string, avatarUrl?: string) =>
    request<User>("/auth/profile", {
      method: "PUT",
      body: json({ displayName, avatarUrl }),
    }),
  favorites: (signal?: AbortSignal) =>
    request<Place[]>("/favorites", { signal }),
  toggleFavorite: (id: number) =>
    request<{ isFavorite: boolean }>(`/places/${id}/favorite`, {
      method: "POST",
    }),
  upload: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ url: string }>("/upload?folder=images", {
      method: "POST",
      body,
    });
  },
};
