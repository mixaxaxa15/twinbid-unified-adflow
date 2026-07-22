# Prelanders ready archive

Готовая библиотека из 30 одностраничных прелендов.

## Что внутри

- `shared/styles.css` — общие стили.
- `shared/engine.js` — общий JS-движок.
- `shared/templates.js` — конфиги всех 30 шаблонов.
- Каждая папка шаблона содержит:
  - `index.html`;
  - `config.js`;
  - `assets/` с placeholder-картинками.

## Как открыть

Самый простой способ:

1. Распаковать архив.
2. Открыть любой `index.html` в браузере.

Если браузер блокирует локальные файлы, запусти локальный сервер из папки `prelanders`:

```bash
python3 -m http.server 8080
```

Потом открой:

```text
http://localhost:8080/adult_blurred_18_gate/
http://localhost:8080/casino_spin_wheel_win/
http://localhost:8080/finance_loan_calculator/
```

## Где менять ссылки

В файле `shared/templates.js` ищи нужный шаблон и меняй:

```js
links: {
  primary: "https://your-offer-link.com",
  secondary: "https://your-exit-link.com"
}
```

Для карточек, категорий и топлистов ссылки могут быть внутри `items`:

```js
items: [
  { title: "Option 1", url: "https://your-offer-1.com" },
  { title: "Option 2", url: "https://your-offer-2.com" }
]
```

## Где менять картинки

В каждом шаблоне есть папка `assets/`.
Можно просто заменить placeholder-файлы своими с теми же именами.

Основные имена:

- `bg.svg` или `bg.jpg` — фон;
- `preview.svg` / `preview.jpg` — превью;
- `reveal.svg` / `reveal.jpg` — картинка для постепенного открытия;
- `p1.svg`, `p2.svg` — профили;
- `cat1.svg`, `cat2.svg` — категории;
- `before.svg`, `after.svg` — before/after;
- `product.svg` — товар.

Если меняешь расширение файла, обнови путь в `shared/templates.js`.

Пример:

```js
assets: {
  background: "./assets/bg.jpg",
  previewImage: "./assets/preview.jpg"
}
```

## Как кастомизировать конкретную папку, не трогая shared/templates.js

В `config.js` можно не просто вызвать шаблон, а переопределить поля:

```js
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
```

## Список шаблонов

1. adult_blurred_18_gate
2. adult_progressive_reveal
3. adult_fake_player_preview
4. adult_video_loading
5. adult_category_selector
6. adult_premium_unlock
7. adult_dating_18_gate
8. adult_dating_quiz_3step
9. adult_dating_nearby_matches
10. adult_dating_profile_carousel
11. adult_dating_blurred_profiles
12. adult_dating_chat_preview
13. casino_spin_wheel_win
14. casino_scratch_bonus
15. casino_slot_minigame
16. casino_pick_a_box
17. casino_lucky_card
18. casino_toplist_bonus
19. betting_match_prediction
20. betting_free_bet_unlock
21. betting_odds_countdown
22. sweep_mystery_box
23. sweep_prize_wheel
24. sweep_survey_3q
25. nutra_problem_solution_quiz
26. nutra_before_after_story
27. nutra_discount_timer
28. finance_loan_calculator
29. finance_approval_check
30. utility_device_check

## Важное

В шаблонах нет explicit-контента. Adult-шаблоны используют blur, age gate, preview placeholders и места под твои изображения.
Для casino/betting тексты не обещают гарантированный выигрыш, но ведут пользователя к тематическому действию: игра, бонус, ставки.
