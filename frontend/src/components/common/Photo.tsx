import { useState } from "react";
import { mediaUrl } from "../../services/http";
import { Icon } from "./Icon";
export function Photo({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src?: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const url = mediaUrl(src);
  const [failedUrl, setFailedUrl] = useState<string>();
  if (!url || failedUrl === url)
    return (
      <div
        className={`photo-fallback ${className}`}
        role="img"
        aria-label={`Chưa có ảnh: ${alt}`}
      >
        <Icon name="fork" size={32} />
        <span>Góc ngon đang chờ lên hình</span>
      </div>
    );
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      width="800"
      height="600"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailedUrl(url)}
    />
  );
}
