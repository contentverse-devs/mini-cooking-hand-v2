/* Bộ nạp công khai chỉ hiển thị dữ liệu đã cung cấp. Prompt và sao chép luôn bị khóa ở static v1. */
const dataUrl = 'data/public-approved-dishes.json';
const allowedStatuses = new Set(['APPROVED', 'REVIEWED']);
const dishSelect = document.querySelector('#dish-select');
const dishCount = document.querySelector('.empty-chip');
const notice = document.querySelector('.dish-panel .notice');
const timelineCount = document.querySelector('.timeline-panel .count');
const timelineBody = document.querySelector('.timeline-panel .empty-state');
const contentStatus = document.querySelector('.status-card .status-value');
const releaseStatus = document.querySelector('.release-state strong');
const releaseDetail = document.querySelector('.release-state small');

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validationError(message) {
  return { ok: false, message };
}

function validateDish(dish, seenIds) {
  if (!isRecord(dish)) return validationError('Một món ăn không phải là đối tượng dữ liệu hợp lệ.');
  if (typeof dish.id !== 'string' || !dish.id.trim()) return validationError('Một món ăn thiếu ID hợp lệ.');
  if (seenIds.has(dish.id)) return validationError(`ID món ăn bị trùng: ${dish.id}.`);
  if (typeof dish.label !== 'string' || !dish.label.trim()) return validationError(`Món ${dish.id} thiếu tên hiển thị.`);
  if (!allowedStatuses.has(dish.status)) return validationError(`Món ${dish.id} có trạng thái không hợp lệ.`);
  if (!Array.isArray(dish.timeline) || dish.timeline.length === 0) return validationError(`Món ${dish.id} thiếu timeline đã cung cấp.`);

  const shots = [];
  const seenShots = new Set();
  for (const shot of dish.timeline) {
    if (!isRecord(shot) || !Number.isInteger(shot.shot) || shot.shot < 1 || typeof shot.title !== 'string' || !shot.title.trim()) {
      return validationError(`Timeline của món ${dish.id} có shot thiếu hoặc không hợp lệ.`);
    }
    if (seenShots.has(shot.shot)) return validationError(`Timeline của món ${dish.id} có số shot bị trùng.`);
    seenShots.add(shot.shot);
    shots.push({ shot: shot.shot, title: shot.title.trim() });
  }
  seenIds.add(dish.id);
  return { ok: true, dish: { id: dish.id, label: dish.label.trim(), status: dish.status, timeline: shots } };
}

function validatePayload(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.dishes)) return validationError('Tệp dữ liệu phải có trường dishes là một mảng.');
  const seenIds = new Set();
  const dishes = [];
  for (const dish of payload.dishes) {
    const result = validateDish(dish, seenIds);
    if (!result.ok) return result;
    dishes.push(result.dish);
  }
  return { ok: true, dishes };
}

function setReleaseLocked(message) {
  document.querySelectorAll('[data-copy]').forEach((button) => { button.disabled = true; });
  document.querySelectorAll('.prompt-card textarea').forEach((field) => { field.value = ''; });
  document.querySelectorAll('.prompt-card .status-label').forEach((label) => { label.textContent = 'KHÓA'; });
  if (releaseStatus) releaseStatus.textContent = 'Chưa sẵn sàng phát hành';
  if (releaseDetail) releaseDetail.textContent = 'Cần xác minh QA và license từ hệ thống';
  if (contentStatus) contentStatus.textContent = 'CHƯA XÁC MINH';
  if (notice) notice.textContent = message;
}

function renderTimeline(dish) {
  if (!timelineBody || !timelineCount) return;
  timelineBody.replaceChildren();
  timelineCount.textContent = `${dish.timeline.length} shot`;
  const heading = document.createElement('h3');
  heading.textContent = `${dish.label} · ${dish.status}`;
  const list = document.createElement('ol');
  for (const item of dish.timeline) {
    const row = document.createElement('li');
    row.textContent = `Shot ${item.shot}: ${item.title}`;
    list.append(row);
  }
  const lockMessage = document.createElement('p');
  lockMessage.textContent = 'Prompt vẫn bị khóa: website tĩnh không xác minh QA hoặc license.';
  timelineBody.append(heading, list, lockMessage);
}

function renderDishes(dishes) {
  if (!dishSelect || !dishCount) return;
  dishSelect.replaceChildren();
  for (const dish of dishes) {
    const option = document.createElement('option');
    option.value = dish.id;
    option.textContent = `${dish.label} — ${dish.status}`;
    dishSelect.append(option);
  }
  dishCount.textContent = `${dishes.length} món đã tải`;
  dishSelect.disabled = dishes.length === 0;
  const renderSelected = () => renderTimeline(dishes.find((dish) => dish.id === dishSelect.value) || dishes[0]);
  dishSelect.addEventListener('change', renderSelected);
  renderSelected();
  setReleaseLocked('Dữ liệu đã tải để xem. Chức năng xuất prompt vẫn khóa cho đến khi có xác minh từ hệ thống.');
}

async function loadPublicDishes() {
  setReleaseLocked('Đang tải dữ liệu công khai đã xác minh…');
  try {
    const response = await fetch(dataUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Không thể tải dữ liệu (${response.status}).`);
    const payload = await response.json();
    const result = validatePayload(payload);
    if (!result.ok) throw new Error(`Từ chối dữ liệu: ${result.message}`);
    if (result.dishes.length === 0) {
      if (dishCount) dishCount.textContent = '0 món đã tải';
      if (dishSelect) dishSelect.disabled = true;
      if (timelineCount) timelineCount.textContent = '0 shot';
      if (timelineBody) timelineBody.replaceChildren();
      setReleaseLocked('Chưa có dữ liệu món ăn được xác minh trong manifest công khai.');
      return;
    }
    renderDishes(result.dishes);
  } catch (error) {
    if (dishCount) dishCount.textContent = '0 món đã tải';
    if (dishSelect) dishSelect.disabled = true;
    if (timelineCount) timelineCount.textContent = '0 shot';
    if (timelineBody) timelineBody.replaceChildren();
    setReleaseLocked(error instanceof Error ? error.message : 'Không thể tải dữ liệu công khai.');
  }
}

window.MiniCookingHandV2Data = Object.freeze({ validatePayload });
void loadPublicDishes();
