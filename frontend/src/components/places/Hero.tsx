import { Icon } from "../common/Icon";
import { FoodStory } from "./FoodStory";
export function Hero() {
  return (
    <section className="hero container">
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="eyebrow-line" />
          Cẩm nang ẩm thực sinh viên
        </span>
        <h1>
          Quanh Làng,
          <br /> có gì <em>ngon?</em>
        </h1>
        <p>
           Khám phá Làng Đại học theo cách của bạn.
        </p>
        <div className="hero-notes">
          <span>
            <Icon name="pin" size={15} />
            Quanh ĐHQG TP.HCM
          </span>
          <span>
            <Icon name="leaf" size={15} />
            Vừa túi tiền
          </span>
        </div>
      </div>
      <FoodStory />
    </section>
  );
}
