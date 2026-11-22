import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import type { ChatPlace } from "../../types/api";
import { Icon } from "./Icon";

type Message = { id: number; role: "assistant" | "user"; text: string; places?: ChatPlace[] };

function safeMapsUrl(place: ChatPlace) {
  const value = place.googleMapsUrl;
  if (value) {
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && url.hostname === "www.google.com" && url.pathname.startsWith("/maps/")) return url.href;
    } catch { /* Build a link from the coordinates below. */ }
  }
  const destination = place.latitude != null && place.longitude != null
    ? `${place.latitude},${place.longitude}`
    : `${place.name} ${place.address} Làng Đại học`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function PlaceSource({ place }: { place: ChatPlace }) {
  return (
    <article className="assistant-place">
      <div className="assistant-place-top">
        <div>
          <Link to={`/quan/${encodeURIComponent(place.slug)}`} className="assistant-place-name">{place.name}</Link>
          <p>{place.areaName} · {place.categoryName}</p>
        </div>
        <span className="assistant-rating"><Icon name="star" size={14} /> {place.averageRating.toFixed(1)}</span>
      </div>
      <p className="assistant-place-meta">{place.priceMin.toLocaleString("vi-VN")}–{place.priceMax.toLocaleString("vi-VN")}đ{place.distanceKm != null ? ` · cách bạn ${place.distanceKm.toFixed(1)} km` : ""}</p>
      {place.highlightReviews?.[0] && <p className="assistant-review">“{place.highlightReviews[0]}”</p>}
      <a className="assistant-map-link" href={safeMapsUrl(place)} target="_blank" rel="noopener noreferrer">
        <Icon name="pin" size={15} /> Xem đường đi trên Google Maps
      </a>
    </article>
  );
}

export function FoodAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: "assistant", text: "Chào bạn! Mình có thể gợi ý quán theo món ăn, khu vực, giá và đánh giá. Bạn đang muốn ăn gì?" },
  ]);
  const list = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  useEffect(() => {
    if (open) list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (event?: FormEvent, preset?: string) => {
    event?.preventDefault();
    const message = (preset ?? input).trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setMessages((current) => [...current, { id: nextId.current++, role: "user", text: message }]);
    try {
      const response = await api.chat(message, location?.lat, location?.lng);
      setGeminiConfigured(response.isGeminiConfigured);
      setMessages((current) => [...current, {
        id: nextId.current++, role: "assistant", text: response.reply,
        places: response.suggestedPlaces,
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: nextId.current++, role: "assistant",
        text: error instanceof Error ? error.message : "Chưa gửi được câu hỏi. Bạn thử lại nhé.",
      }]);
    } finally {
      setBusy(false);
    }
  };

  const useLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Trình duyệt này chưa hỗ trợ chia sẻ vị trí.");
      return;
    }
    setLocationMessage("Đang lấy vị trí…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
        setLocationMessage("Đã bật gợi ý theo vị trí. Tọa độ chỉ gửi cùng câu hỏi bạn gửi.");
      },
      () => setLocationMessage("Không lấy được vị trí. Bạn vẫn có thể hỏi theo khu vực."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <>
      {open && (
        <section id="assistant-panel" className="assistant-panel" aria-label="Trợ lý ẩm thực">
          <header className="assistant-header">
            <div className="assistant-avatar"><Icon name="message" size={18} /></div>
            <div className="assistant-title"><strong>Trợ lý ẩm thực</strong>{geminiConfigured === false && <span>Gợi ý cơ bản · Gemini chưa cấu hình</span>}</div>
            <button className="icon-button assistant-close" onClick={() => setOpen(false)} aria-label="Đóng trợ lý"><Icon name="close" /></button>
          </header>
          <div className="assistant-toolbar">
            <span>{location ? "Gợi ý gần vị trí của bạn" : "Hỏi theo món, giá hoặc khu vực"}</span>
          <button type="button" onClick={useLocation} aria-label={location ? "Đã bật chia sẻ vị trí" : "Cho phép dùng vị trí để tìm quán gần tôi"}><Icon name="pin" size={15} /> {location ? "Đã bật vị trí" : "Quán gần tôi"}</button>
          </div>
          {locationMessage && <p className="assistant-location-note" role="status">{locationMessage}</p>}
          <div className="assistant-messages" ref={list} aria-live="polite" aria-relevant="additions">
            {messages.map((message) => (
              <div className={`assistant-message-row ${message.role}`} key={message.id}>
                <p className="assistant-bubble">{message.text}</p>
                {!!message.places?.length && <div className="assistant-place-list">{message.places.map((place) => <PlaceSource key={place.placeId} place={place} />)}</div>}
              </div>
            ))}
            {busy && <p className="assistant-thinking" role="status">Đang tìm quán phù hợp…</p>}
          </div>
          <div className="assistant-quick-prompts">
            <button type="button" disabled={busy} onClick={() => void send(undefined, "Gợi ý quán ngon, giá sinh viên ở KTX Khu B")}>Ngon, giá sinh viên</button>
            <button type="button" disabled={busy} onClick={() => void send(undefined, "Quán nào được đánh giá cao nhất?")}>Điểm đánh giá cao</button>
          </div>
          <form className="assistant-composer" onSubmit={(event) => void send(event)}>
            <label className="sr-only" htmlFor="assistant-message">Câu hỏi về quán ăn</label>
            <textarea id="assistant-message" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} rows={1} placeholder="Bạn muốn ăn gì?" disabled={busy} />
            <button type="submit" className="assistant-send" disabled={busy || input.trim().length < 2} aria-label="Gửi câu hỏi"><Icon name="arrow" size={18} /></button>
          </form>
        </section>
      )}
      <button className="assistant-launcher" type="button" aria-expanded={open} aria-controls="assistant-panel" onClick={() => setOpen((value) => !value)}>
        <Icon name={open ? "close" : "message"} size={19} /> <span>{open ? "Đóng trợ lý" : "Hỏi quán ăn"}</span>
      </button>
    </>
  );
}
