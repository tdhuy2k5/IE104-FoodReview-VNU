import { useEffect, useId, useState } from "react";
import { validateImage } from "../../utils/format";
import { Icon } from "../common/Icon";
export function ImageUploader({
  files,
  onChange,
  existingCount = 0,
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  existingCount?: number;
  disabled?: boolean;
}) {
  const [error, setError] = useState(""),
    [previews, setPreviews] = useState<string[]>([]);
  const id = useId();
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);
  return (
    <div className="image-uploader">
      <label className="upload-target">
        <Icon name="camera" size={24} />
        <strong>Thêm ảnh trải nghiệm</strong>
        <span>JPG, PNG, WebP · tối đa 5 MB/ảnh · tối đa 5 ảnh</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || files.length + existingCount >= 5}
          aria-describedby={error ? id : undefined}
          onChange={(e) => {
            const added = Array.from(e.target.files || []);
            e.target.value = "";
            if (files.length + existingCount + added.length > 5) {
              setError("Bạn có thể đính kèm tối đa 5 ảnh.");
              return;
            }
            const invalid = added.map(validateImage).find(Boolean);
            if (invalid) {
              setError(invalid);
              return;
            }
            setError("");
            onChange([...files, ...added]);
          }}
        />
      </label>
      {error && (
        <p id={id} className="field-error" role="alert">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <div className="upload-previews">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`}>
              <img
                src={previews[index]}
                alt={`Ảnh đã chọn: ${file.name}`}
                width="80"
                height="80"
              />
              <button
                type="button"
                disabled={disabled}
                aria-label={`Bỏ ảnh ${file.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
