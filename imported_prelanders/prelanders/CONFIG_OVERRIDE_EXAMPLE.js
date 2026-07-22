// Example: paste this into any template folder config.js instead of one-line render call.
// It clones a base template and overrides links/images/text without changing shared/templates.js.
const base = window.PRELANDER_TEMPLATES.casino_spin_wheel_win;
window.__renderPrelander({
  ...base,
  assets: {
    ...base.assets,
    background: "./assets/my-bg.jpg"
  },
  links: {
    primary: "https://your-offer-link.com"
  },
  texts: {
    ...base.texts,
    title: "Испытайте удачу",
    finalCta: "Перейти к игре"
  }
});
