import { useState } from "react";
import "./FoodStory.css";

export function FoodStory() {
  const [paused, setPaused] = useState(false);

  return (
    <div className="hero-art food-story" data-paused={paused}>
      <div className="food-story-heading">
        <span>MỘT TÔ NGON, NHIỀU CÂU CHUYỆN</span>
        <button
          type="button"
          aria-pressed={paused}
          aria-label={paused ? "Tiếp tục hoạt ảnh món ăn" : "Tạm dừng hoạt ảnh món ăn"}
          onClick={() => setPaused(!paused)}
        >
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
      </div>
      <svg className="food-story-scene" viewBox="0 0 440 330" role="img" aria-labelledby="food-story-title">
        <title id="food-story-title">Tô bún được thêm rau, món ăn kèm và tỏa hơi nóng</title>
        <circle cx="220" cy="166" r="137" fill="#edf0e4" />
        <circle cx="220" cy="166" r="156" fill="none" stroke="#d9dfcd" strokeDasharray="3 8" />
        <ellipse cx="220" cy="289" rx="119" ry="12" fill="#183b30" opacity=".08" />
        <g className="food-story-bowl">
          <path d="M100 174c7 72 48 105 120 105s113-33 120-105" fill="#183b30" />
          <path d="M114 192c12 44 37 65 69 72" fill="none" stroke="#fcfaf6" strokeWidth="4" strokeLinecap="round" opacity=".5" />
          <path d="M190 278v8q30 10 60 0v-8" fill="#235243" />
          <ellipse cx="220" cy="174" rx="123" ry="43" fill="#fcfaf6" stroke="#183b30" strokeWidth="5" />
          <ellipse cx="220" cy="173" rx="108" ry="32" fill="#dca05a" />
          <g fill="none" stroke="#f9e7b9" strokeWidth="5" strokeLinecap="round">
            <path d="M140 171q21-28 48-4t48 0 52 4" />
            <path d="M147 182q20-28 46-4t48-1 52 2" />
            <path d="M162 158q20-18 40 0t42-3 43 7" />
          </g>
          <g className="food-story-topping">
            <ellipse cx="253" cy="164" rx="24" ry="16" transform="rotate(-18 253 164)" fill="#fcfaf6" />
            <ellipse cx="253" cy="164" rx="12" ry="10" fill="#e8ad42" />
            <path d="M173 151q-24-30-39-12 4 26 39 12m0 0q-6-35 15-34 17 23-15 34" fill="#618459" />
            <path d="m169 159 15-14m-9 14 16-6" stroke="#315b3b" strokeWidth="4" strokeLinecap="round" />
            <path d="m290 177 12-13 9 11-12 12Z" fill="#b96636" />
            <path d="m200 182 13-10 10 10-12 9Z" fill="#b96636" />
            <g fill="#315b3b">
              <ellipse cx="221" cy="150" rx="6" ry="3" transform="rotate(25 221 150)" />
              <ellipse cx="235" cy="187" rx="6" ry="3" transform="rotate(-20 235 187)" />
              <ellipse cx="155" cy="178" rx="5" ry="3" />
            </g>
          </g>
          <path d="m299 144 61-91m-49 94 61-90" stroke="#b66c38" strokeWidth="7" strokeLinecap="round" />
          <path d="M207 225q13 13 26 0" fill="none" stroke="#f9e7b9" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="food-story-steam" fill="none" stroke="#9cae91" strokeWidth="4" strokeLinecap="round">
          <path d="M190 121c-17-20 15-25 1-47" />
          <path d="M221 112c-17-20 15-25 1-47" />
          <path d="M252 120c-17-20 15-25 1-47" />
        </g>
        <g className="food-story-sparkles" fill="#c7793b">
          <path d="m94 104 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" />
          <path d="m350 220 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
        </g>
      </svg>
      <div className="food-story-message food-story-message-one">
        <span className="food-story-avatar" aria-hidden="true">✦</span>
        <p><strong>Ấm bụng sau giờ học.</strong><span>Nước dùng thơm, rau tươi nữa!</span></p>
      </div>
      <div className="food-story-message food-story-message-two">
        <span className="food-story-avatar" aria-hidden="true">♡</span>
        <p><strong>Đi cùng bạn là ngon hơn.</strong><span>Mai lại ghé quán này nhé.</span></p>
      </div>
      <div className="food-story-caption">
        <span>Lời chia sẻ minh họa</span>
        <span>ĂN NGON / KỂ THẬT</span>
      </div>
      <div className="food-story-progress" aria-hidden="true"><span /></div>
    </div>
  );
}
