const platforms = [
  {
    name: "Booking.com",
    note: "已帶入價格區間；若早餐篩選未套用，進站後再勾選含早餐。",
    buildUrl: ({ destination, checkin, checkout, adults, rooms, minPrice, maxPrice }) =>
      `https://www.booking.com/searchresults.zh-tw.html?ss=${enc(destination)}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&no_rooms=${rooms}&group_children=0&selected_currency=TWD&order=price&nflt=${enc(`price=TWD-${minPrice}-${maxPrice}-1;mealplan=1`)}`
  },
  {
    name: "Agoda",
    note: "已帶地點、日期、人數與預算參數；若價格未套用，進站後用站內價格篩選確認。",
    buildUrl: ({ agodaSlug, checkin, checkout, adults, rooms, minPrice, maxPrice }) => {
      const nights = Math.max(1, Math.round((parseDate(checkout) - parseDate(checkin)) / 86400000));
      const params = new URLSearchParams({
        finalPriceView: "1",
        isShowMobileAppPrice: "false",
        cid: "-1",
        adults: String(adults),
        children: "0",
        rooms: String(rooms),
        checkIn: checkin,
        checkOut: checkout,
        los: String(nights),
        travellerType: "1",
        currencyCode: "TWD",
        sort: "priceLowToHigh",
        minPrice: String(minPrice),
        maxPrice: String(maxPrice),
        priceMin: String(minPrice),
        priceMax: String(maxPrice)
      });
      return `https://www.agoda.com/zh-tw/city/${agodaSlug}.html?${params.toString()}`;
    }
  },
  {
    name: "Hotels.com",
    note: "適合比對可取消、含早餐與總價顯示。",
    buildUrl: ({ destination, checkin, checkout, adults, rooms }) =>
      `https://tw.hotels.com/Hotel-Search?destination=${enc(destination)}&startDate=${checkin}&endDate=${checkout}&rooms=${rooms}&adults=${adults}`
  },
  {
    name: "Trip.com",
    note: "可交叉檢查促銷房型與早餐方案。",
    buildUrl: ({ destination, checkin, checkout, adults, rooms }) =>
      `https://tw.trip.com/hotels/list?city=${enc(destination)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}&rooms=${rooms}&searchword=${enc(destination + " 含早餐")}`
  },
  {
    name: "Klook",
    note: "套票與旅宿優惠可能出現在活動頁。",
    buildUrl: ({ label, checkin, checkout }) =>
      `https://www.klook.com/zh-TW/search/result/?query=${enc(label + " 飯店 含早餐 " + checkin + " " + checkout)}`
  },
  {
    name: "Google 飯店",
    note: "快速掃各平台價差，再回訂房站確認條件。",
    buildUrl: ({ destination, checkin, checkout, minPrice, maxPrice }) =>
      `https://www.google.com/travel/hotels?q=${enc(destination)}&checkin=${checkin}&checkout=${checkout}&prices=${minPrice}-${maxPrice}`
  }
];

const form = document.querySelector("#hotel-form");
const platformList = document.querySelector("#platform-list");
const summaryLine = document.querySelector("#summary-line");
const checkinInput = document.querySelector("#checkin");
const checkoutInput = document.querySelector("#checkout");
const nextWeekendButton = document.querySelector("#next-weekend");
const copyButton = document.querySelector("#copy-summary");
const openAllButton = document.querySelector("#open-all");

function enc(value) {
  return encodeURIComponent(value);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getNextSaturday(from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = date.getDay();
  const offset = (6 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + offset);
  return date;
}

function setWeekendDates() {
  const saturday = getNextSaturday();
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  checkinInput.value = toDateInputValue(saturday);
  checkoutInput.value = toDateInputValue(sunday);
}

function getState() {
  const destinationInput = form.querySelector("input[name='destination']:checked");
  const minPrice = Number(document.querySelector("#min-price").value || 0);
  const maxPrice = Number(document.querySelector("#max-price").value || 0);
  return {
    destination: destinationInput.value,
    label: destinationInput.dataset.label,
    agodaSlug: destinationInput.dataset.agodaSlug,
    checkin: checkinInput.value,
    checkout: checkoutInput.value,
    minPrice,
    maxPrice,
    adults: Number(document.querySelector("#adults").value || 1),
    rooms: Number(document.querySelector("#rooms").value || 1)
  };
}

function clampNumericInputs() {
  for (const input of form.querySelectorAll("input[type='number']")) {
    const min = Number(input.min || 0);
    const max = input.max ? Number(input.max) : Infinity;
    const value = Number(input.value || min);
    input.value = Math.min(Math.max(value, min), max);
  }
}

function keepCheckoutAfterCheckin() {
  if (!checkinInput.value || !checkoutInput.value) return;
  const checkin = parseDate(checkinInput.value);
  const checkout = parseDate(checkoutInput.value);
  if (checkout <= checkin) {
    checkin.setDate(checkin.getDate() + 1);
    checkoutInput.value = toDateInputValue(checkin);
  }
}

function buildSummary(state) {
  const budget = `NT$${state.minPrice.toLocaleString("zh-TW")} - NT$${state.maxPrice.toLocaleString("zh-TW")}`;
  return `${state.label}｜${state.checkin} 入住、${state.checkout} 退房｜${state.adults} 大人 ${state.rooms} 房｜${budget}｜含早餐`;
}

function render() {
  clampNumericInputs();
  keepCheckoutAfterCheckin();
  const state = getState();
  summaryLine.textContent = buildSummary(state);
  platformList.innerHTML = platforms.map((platform) => {
    const url = platform.buildUrl(state);
    return `
      <article class="platform-card">
        <div class="platform-meta">
          <h3>${platform.name}</h3>
          <p>${platform.note}</p>
        </div>
        <a class="platform-action" href="${url}" target="_blank" rel="noopener" aria-label="開啟 ${platform.name}" title="開啟 ${platform.name}">
          <i data-lucide="arrow-up-right"></i>
        </a>
      </article>
    `;
  }).join("");
  if (window.lucide) lucide.createIcons();
}

function getCurrentUrls() {
  const state = getState();
  return platforms.map((platform) => platform.buildUrl(state));
}

function copySummary() {
  const state = getState();
  const text = [
    buildSummary(state),
    "",
    ...platforms.map((platform) => `${platform.name}: ${platform.buildUrl(state)}`)
  ].join("\n");
  navigator.clipboard.writeText(text).then(() => {
    copyButton.title = "已複製";
    setTimeout(() => {
      copyButton.title = "複製搜尋條件";
    }, 1200);
  });
}

form.addEventListener("input", render);
form.addEventListener("change", render);
nextWeekendButton.addEventListener("click", () => {
  setWeekendDates();
  render();
});
copyButton.addEventListener("click", copySummary);
openAllButton.addEventListener("click", () => {
  getCurrentUrls().forEach((url) => window.open(url, "_blank", "noopener"));
});

setWeekendDates();
render();
