/**
 * Hiển thị đánh giá, tạo/xóa đánh giá, báo cáo vi phạm.
 */
const Reviews = (() => {
  function avatarHtml(author) {
    const avatar = Utils.imageUrl(author.avatarUrl);
    return `
      <span class="avatar">
        ${Utils.escapeHtml(Utils.initials(author.displayName))}
        ${avatar ? `<img src="${Utils.escapeHtml(avatar)}" alt="" onerror="this.remove()" />` : ''}
      </span>`;
  }

  function reviewHtml(review, showPlace) {
    const own = Auth.isLoggedIn() && Auth.user.id === review.author.id;
    const canReport = Auth.isLoggedIn() && !own;
    const statusBadge = review.status !== 1
      ? `<span class="badge badge-warn">${Utils.escapeHtml(Utils.label(Utils.REVIEW_STATUS, review.status))}</span>`
      : '';

    const images = (review.images || []).map((image) => {
      const url = Utils.imageUrl(image.imageUrl);
      return `
        <a class="review-image" href="${Utils.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          <img src="${Utils.escapeHtml(url)}" alt="${Utils.escapeHtml(image.altText || 'Ảnh đánh giá')}" loading="lazy" />
        </a>`;
    }).join('');

    return `
      <article class="review-item">
        <div class="review-head">
          ${avatarHtml(review.author)}
          <span class="review-by">
            <strong>${Utils.escapeHtml(review.author.displayName)}</strong>
            <span class="muted small">${Utils.formatDate(review.createdAt)}</span>
          </span>
          <span class="rating-pill">★ ${review.rating}</span>
          ${statusBadge}
        </div>
        ${showPlace ? `<button class="review-place-link" type="button" data-open-place="${review.placeId}">📍 ${Utils.escapeHtml(review.placeName)}</button>` : ''}
        <p class="review-content">${Utils.escapeHtml(review.content)}</p>
        ${images ? `<div class="review-images">${images}</div>` : ''}
        <div class="review-actions">
          ${own ? `<button class="link-btn danger" type="button" data-action="delete-review" data-id="${review.id}">Xóa</button>` : ''}
          ${canReport ? `<button class="link-btn" type="button" data-action="report-review" data-id="${review.id}">Báo cáo</button>` : ''}
        </div>
      </article>`;
  }

  function listHtml(reviews, options = {}) {
    if (!reviews || !reviews.length) return '';
    const showPlace = !!options.showPlace;
    return reviews.map((review) => reviewHtml(review, showPlace)).join('');
  }

  function formHtml(placeId) {
    return `
      <form class="review-form" data-review-form data-place-id="${placeId}">
        <h4>Viết đánh giá của bạn</h4>
        <div class="form-row">
          <label class="field">
            <span>Chấm điểm *</span>
            <select name="rating" required>
              <option value="5">★★★★★ Rất ngon (5)</option>
              <option value="4">★★★★☆ Ngon (4)</option>
              <option value="3">★★★☆☆ Ổn (3)</option>
              <option value="2">★★☆☆☆ Tạm (2)</option>
              <option value="1">★☆☆☆☆ Kém (1)</option>
            </select>
          </label>
          <label class="field">
            <span>Ảnh minh họa (tuỳ chọn)</span>
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" />
          </label>
        </div>
        <label class="field">
          <span>Nội dung *</span>
          <textarea name="content" rows="3" maxlength="2000" required
            placeholder="Chia sẻ trải nghiệm của bạn về quán..."></textarea>
        </label>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Gửi đánh giá</button>
          <span class="muted small">Ảnh tối đa 5MB (.jpg, .png, .webp)</span>
        </div>
      </form>`;
  }

  async function submit(form, placeId) {
    const data = new FormData(form);
    const rating = Number(data.get('rating'));
    const content = String(data.get('content') || '').trim();
    if (!content) throw new Error('Vui lòng nhập nội dung đánh giá.');
    if (!rating || rating < 1 || rating > 5) throw new Error('Vui lòng chọn điểm từ 1 đến 5.');

    const imageUrls = [];
    const file = data.get('image');
    if (file && typeof file !== 'string' && file.size > 0) {
      const uploadRes = await API.upload(file);
      const url = uploadRes?.data?.url;
      if (url) imageUrls.push(url);
    }

    return API.post(`/api/Reviews/place/${placeId}`, { rating, content, imageUrls });
  }

  async function remove(id) {
    return API.del(`/api/Reviews/${id}`);
  }

  async function loadMine() {
    const container = Utils.$('#myReviewsList');
    if (!container) return;
    container.innerHTML = Utils.skeletonCards(3);
    try {
      const res = await API.get('/api/Reviews/my?page=1&pageSize=50');
      const items = res.data?.items || [];
      if (!items.length) {
        container.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📝</span>
            <h3>Chưa có đánh giá nào</h3>
            <p>Hãy khám phá và chia sẻ trải nghiệm đầu tiên của bạn.</p>
            <button class="btn btn-primary" type="button" data-view="places">Khám phá quán ăn</button>
          </div>`;
        return;
      }
      container.innerHTML = listHtml(items, { showPlace: true });
    } catch (error) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">⚠️</span>
          <h3>Không tải được đánh giá</h3>
          <p>${Utils.escapeHtml(error.message)}</p>
        </div>`;
      Utils.toast(error.message, 'error');
    }
  }

  function openReport(reviewId) {
    const form = Utils.$('#reportForm');
    if (!form) return;
    form.reset();
    form.elements.reviewId.value = reviewId;
    Utils.openModal('reportModal');
  }

  async function submitReport(form) {
    const data = new FormData(form);
    const reviewId = Number(data.get('reviewId'));
    const reason = Number(data.get('reason'));
    const description = String(data.get('description') || '').trim();
    return API.post(`/api/Reviews/${reviewId}/report`, {
      reviewId,
      reason,
      description: description || null,
    });
  }

  return { listHtml, formHtml, submit, remove, loadMine, openReport, submitReport };
})();
