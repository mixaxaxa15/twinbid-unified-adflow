window.PRELANDER_TEMPLATES = {
  "adult_blurred_18_gate": {
    "type": "age_gate",
    "meta": {
      "title": "18+ Only"
    },
    "theme": {
      "accent": "#ff4d6d",
      "accent2": "#a855f7"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/offer",
      "secondary": "https://example.com/exit"
    },
    "behavior": {
      "blurBackground": true
    },
    "texts": {
      "badge": "18+",
      "title": "Вам есть 18 лет?",
      "subtitle": "Подтвердите возраст для перехода",
      "primaryCta": "Да",
      "secondaryCta": "Нет"
    }
  },
  "adult_progressive_reveal": {
    "type": "progressive_reveal",
    "meta": {
      "title": "Preview"
    },
    "theme": {
      "accent": "#ff4d6d",
      "accent2": "#7c3aed"
    },
    "assets": {
      "background": "./assets/bg.svg",
      "revealImage": "./assets/reveal.svg"
    },
    "links": {
      "primary": "https://example.com/offer"
    },
    "behavior": {
      "blurBackground": true,
      "revealClicks": 3,
      "tiles": 9
    },
    "texts": {
      "badge": "18+",
      "title": "Откройте превью",
      "subtitle": "Нажмите несколько раз, чтобы увидеть больше",
      "primaryCta": "Открыть ещё"
    }
  },
  "adult_fake_player_preview": {
    "type": "fake_player",
    "meta": {
      "title": "Player"
    },
    "assets": {
      "background": "./assets/bg.svg",
      "previewImage": "./assets/preview.svg"
    },
    "links": {
      "primary": "https://example.com/offer"
    },
    "behavior": {
      "blurBackground": true,
      "blurPreview": true
    },
    "texts": {
      "badge": "18+",
      "title": "Нажмите Play",
      "subtitle": "Видео доступно после перехода"
    }
  },
  "adult_video_loading": {
    "type": "loading",
    "meta": {
      "title": "Loading"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/offer"
    },
    "behavior": {
      "blurBackground": true,
      "autoRedirect": true,
      "speed": 90
    },
    "texts": {
      "badge": "Видео",
      "title": "Подготовка видео…",
      "subtitle": "Пожалуйста, подождите",
      "loadingPrefix": "Загрузка"
    }
  },
  "adult_category_selector": {
    "type": "category_select",
    "meta": {
      "title": "Select category"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/offer"
    },
    "behavior": {
      "blurBackground": true
    },
    "texts": {
      "badge": "18+",
      "title": "Выберите категорию",
      "subtitle": "Нажмите на интересующий вариант"
    },
    "items": [
      {
        "title": "Категория 1",
        "subtitle": "Подставь свой текст",
        "image": "./assets/cat1.svg",
        "url": "https://example.com/offer1"
      },
      {
        "title": "Категория 2",
        "subtitle": "Подставь свой текст",
        "image": "./assets/cat2.svg",
        "url": "https://example.com/offer2"
      },
      {
        "title": "Категория 3",
        "subtitle": "Подставь свой текст",
        "image": "./assets/cat3.svg",
        "url": "https://example.com/offer3"
      },
      {
        "title": "Категория 4",
        "subtitle": "Подставь свой текст",
        "image": "./assets/cat4.svg",
        "url": "https://example.com/offer4"
      }
    ]
  },
  "adult_premium_unlock": {
    "type": "premium_unlock",
    "meta": {
      "title": "Unlock"
    },
    "assets": {
      "background": "./assets/bg.svg",
      "previewImage": "./assets/preview.svg",
      "lockImage": ""
    },
    "links": {
      "primary": "https://example.com/offer"
    },
    "behavior": {
      "blurBackground": true,
      "blurPreview": true
    },
    "texts": {
      "title": "Доступ ограничен",
      "subtitle": "Разблокируйте полный доступ",
      "lockIcon": "🔒",
      "primaryCta": "Разблокировать"
    }
  },
  "adult_dating_18_gate": {
    "type": "category_select",
    "meta": {
      "title": "Dating 18+"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/dating"
    },
    "behavior": {
      "blurBackground": true
    },
    "texts": {
      "badge": "18+",
      "title": "Кого вы ищете?",
      "subtitle": "Выберите подходящий вариант"
    },
    "items": [
      {
        "title": "Женщину",
        "subtitle": "Показать анкеты",
        "image": "./assets/opt1.svg",
        "url": "https://example.com/dating1"
      },
      {
        "title": "Мужчину",
        "subtitle": "Показать анкеты",
        "image": "./assets/opt2.svg",
        "url": "https://example.com/dating2"
      },
      {
        "title": "Пару",
        "subtitle": "Показать анкеты",
        "image": "./assets/opt3.svg",
        "url": "https://example.com/dating3"
      },
      {
        "title": "Неважно",
        "subtitle": "Показать анкеты",
        "image": "./assets/opt4.svg",
        "url": "https://example.com/dating4"
      }
    ]
  },
  "adult_dating_quiz_3step": {
    "type": "quiz",
    "meta": {
      "title": "Dating quiz"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/dating"
    },
    "behavior": {
      "blurBackground": true
    },
    "texts": {
      "badge": "Dating",
      "subtitle": "Ответьте на 3 вопроса"
    },
    "questions": [
      {
        "title": "Кого вы ищете?",
        "options": [
          {
            "label": "Женщину"
          },
          {
            "label": "Мужчину"
          },
          {
            "label": "Пару"
          }
        ]
      },
      {
        "title": "Возрастной диапазон?",
        "options": [
          {
            "label": "18–25"
          },
          {
            "label": "26–35"
          },
          {
            "label": "36+"
          }
        ]
      },
      {
        "title": "Что вас интересует?",
        "options": [
          {
            "label": "Общение"
          },
          {
            "label": "Встречи"
          },
          {
            "label": "Новое знакомство"
          }
        ]
      }
    ]
  },
  "adult_dating_nearby_matches": {
    "type": "nearby_profiles",
    "meta": {
      "title": "Nearby matches"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/dating"
    },
    "behavior": {
      "blurBackground": true,
      "blurCards": true
    },
    "texts": {
      "badge": "Nearby",
      "title": "Найдены анкеты рядом",
      "subtitle": "Подождите, проверяем доступность"
    },
    "items": [
      {
        "title": "Анкета 1",
        "subtitle": "2 км рядом",
        "image": "./assets/p1.svg"
      },
      {
        "title": "Анкета 2",
        "subtitle": "4 км рядом",
        "image": "./assets/p2.svg"
      },
      {
        "title": "Анкета 3",
        "subtitle": "6 км рядом",
        "image": "./assets/p3.svg"
      },
      {
        "title": "Анкета 4",
        "subtitle": "8 км рядом",
        "image": "./assets/p4.svg"
      }
    ]
  },
  "adult_dating_profile_carousel": {
    "type": "profile_carousel",
    "meta": {
      "title": "Profiles"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/dating"
    },
    "behavior": {
      "blurBackground": true,
      "actionsBeforeRedirect": 3
    },
    "texts": {
      "badge": "Dating",
      "primaryCta": "Нравится",
      "secondaryCta": "Пропустить"
    },
    "items": [
      {
        "title": "Анкета 1",
        "subtitle": "23 года",
        "image": "./assets/p1.svg"
      },
      {
        "title": "Анкета 2",
        "subtitle": "24 года",
        "image": "./assets/p2.svg"
      },
      {
        "title": "Анкета 3",
        "subtitle": "25 года",
        "image": "./assets/p3.svg"
      }
    ]
  },
  "adult_dating_blurred_profiles": {
    "type": "grid_unlock",
    "meta": {
      "title": "Profiles"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/dating"
    },
    "behavior": {
      "blurBackground": true,
      "blurCards": true
    },
    "texts": {
      "badge": "Dating",
      "title": "Анкеты доступны после подтверждения",
      "subtitle": "Откройте фото и перейдите дальше",
      "primaryCta": "Открыть фото"
    },
    "items": [
      {
        "title": "Анкета 1",
        "image": "./assets/p1.svg"
      },
      {
        "title": "Анкета 2",
        "image": "./assets/p2.svg"
      },
      {
        "title": "Анкета 3",
        "image": "./assets/p3.svg"
      },
      {
        "title": "Анкета 4",
        "image": "./assets/p4.svg"
      }
    ]
  },
  "adult_dating_chat_preview": {
    "type": "chat_preview",
    "meta": {
      "title": "Chat preview"
    },
    "assets": {
      "background": "./assets/bg.svg",
      "avatarImage": ""
    },
    "links": {
      "primary": "https://example.com/dating"
    },
    "behavior": {
      "blurBackground": true
    },
    "texts": {
      "badge": "Chat",
      "title": "Доступны новые знакомства",
      "subtitle": "Откройте чат и перейдите на сайт",
      "primaryCta": "Открыть чат"
    },
    "items": [
      {
        "title": "Привет! Кажется, мы совсем рядом 😊",
        "side": "incoming",
        "time": "20:41"
      },
      {
        "title": "Чем занимаешься сегодня?",
        "side": "incoming",
        "time": "20:42"
      },
      {
        "title": "Буду ждать твоего ответа",
        "side": "incoming",
        "time": "сейчас"
      }
    ]
  },
  "casino_spin_wheel_win": {
    "type": "wheel",
    "meta": {
      "title": "Spin wheel"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/casino"
    },
    "texts": {
      "badge": "Casino Bonus",
      "title": "Испытайте удачу",
      "subtitle": "Крутите колесо и узнайте свой бонус",
      "primaryCta": "Крутить",
      "resultTitle": "Бонус активирован",
      "resultText": "Реальная игра и бонусы доступны на сайте",
      "finalCta": "Перейти к игре"
    },
    "behavior": {
      "rotation": 1830
    }
  },
  "casino_scratch_bonus": {
    "type": "scratch",
    "meta": {
      "title": "Scratch bonus"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/casino"
    },
    "texts": {
      "badge": "Casino Bonus",
      "title": "Сотрите карту",
      "subtitle": "Под ней скрывается бонус",
      "coverText": "Стереть",
      "revealText": "+100%",
      "resultTitle": "Ваш бонус найден",
      "resultText": "Используйте его на сайте",
      "finalCta": "Перейти к игре"
    }
  },
  "casino_slot_minigame": {
    "type": "slot",
    "meta": {
      "title": "Slot mini game"
    },
    "assets": {
      "background": "./assets/bg.svg",
      "slotFrame": ""
    },
    "links": {
      "primary": "https://example.com/casino"
    },
    "texts": {
      "badge": "Slot",
      "title": "Сделайте спин",
      "subtitle": "Проверьте, активируется ли бонус",
      "primaryCta": "Spin",
      "resultTitle": "Бонус активирован",
      "resultText": "Перейдите на сайт и начните игру",
      "finalCta": "Перейти к игре"
    },
    "behavior": {
      "symbols": [
        "7",
        "7",
        "7"
      ]
    },
    "slotSettings": {
      "symbolMode": "text",
      "animationStyle": "slide",
      "initialSymbol": "?",
      "spinDuration": 1800,
      "reel1ExtraDuration": 0,
      "reel2ExtraDuration": 320,
      "reel3ExtraDuration": 640,
      "reel1TickInterval": 65,
      "reel2TickInterval": 75,
      "reel3TickInterval": 85,
      "reel1ResultIndex": 7,
      "reel2ResultIndex": 7,
      "reel3ResultIndex": 7,
      "reel1Direction": "down",
      "reel2Direction": "down",
      "reel3Direction": "down",
      "resultDelay": 320
    },
    "items": [
      { "label": "0", "image": "" },
      { "label": "1", "image": "" },
      { "label": "2", "image": "" },
      { "label": "3", "image": "" },
      { "label": "4", "image": "" },
      { "label": "5", "image": "" },
      { "label": "6", "image": "" },
      { "label": "7", "image": "" },
      { "label": "8", "image": "" },
      { "label": "9", "image": "" }
    ]
  },
  "casino_pick_a_box": {
    "type": "pick_box",
    "meta": {
      "title": "Pick a box"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/casino"
    },
    "texts": {
      "badge": "Bonus",
      "title": "Выберите один сундук",
      "subtitle": "Внутри может быть ваш бонус",
      "finalCta": "Перейти"
    },
    "items": [
      {
        "emoji": "🎁",
        "resultTitle": "Найден бонус",
        "resultText": "Реальные бонусы доступны на сайте",
        "url": "https://example.com/casino1"
      },
      {
        "emoji": "🎁",
        "resultTitle": "Найден бонус",
        "resultText": "Реальные бонусы доступны на сайте",
        "url": "https://example.com/casino2"
      },
      {
        "emoji": "🎁",
        "resultTitle": "Найден бонус",
        "resultText": "Реальные бонусы доступны на сайте",
        "url": "https://example.com/casino3"
      }
    ]
  },
  "casino_lucky_card": {
    "type": "pick_box",
    "meta": {
      "title": "Lucky card"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/casino"
    },
    "texts": {
      "badge": "Lucky Card",
      "title": "Выберите карту",
      "subtitle": "Карта покажет ваш бонус",
      "finalCta": "Перейти к игре"
    },
    "items": [
      {
        "emoji": "🂠",
        "resultTitle": "Бонус открыт",
        "resultText": "Ваш бонус ждёт на сайте"
      },
      {
        "emoji": "🂠",
        "resultTitle": "Бонус открыт",
        "resultText": "Ваш бонус ждёт на сайте"
      },
      {
        "emoji": "🂠",
        "resultTitle": "Бонус открыт",
        "resultText": "Ваш бонус ждёт на сайте"
      }
    ]
  },
  "casino_toplist_bonus": {
    "type": "toplist",
    "meta": {
      "title": "Top casinos"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "texts": {
      "badge": "Top 3",
      "title": "Популярные бонусы",
      "subtitle": "Выберите подходящий вариант"
    },
    "items": [
      {
        "title": "Casino 1",
        "subtitle": "+100% на первый депозит",
        "rating": "4.9",
        "image": "./assets/t1.svg",
        "cta": "Играть",
        "url": "https://example.com/c1"
      },
      {
        "title": "Casino 2",
        "subtitle": "Free spins для новых игроков",
        "rating": "4.8",
        "image": "./assets/t2.svg",
        "cta": "Играть",
        "url": "https://example.com/c2"
      },
      {
        "title": "Casino 3",
        "subtitle": "Бонус для новых игроков",
        "rating": "4.7",
        "image": "./assets/t3.svg",
        "cta": "Играть",
        "url": "https://example.com/c3"
      }
    ]
  },
  "betting_match_prediction": {
    "type": "prediction",
    "meta": {
      "title": "Prediction"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/betting"
    },
    "texts": {
      "badge": "Sports",
      "title": "Кто победит?",
      "subtitle": "Выберите исход и переходите к ставкам",
      "resultTitle": "Прогноз принят",
      "resultText": "Ставки на реальные события доступны на сайте",
      "finalCta": "Перейти к ставкам"
    },
    "items": [
      {
        "title": "Команда 1"
      },
      {
        "title": "Команда 2"
      }
    ]
  },
  "betting_free_bet_unlock": {
    "type": "freebet",
    "meta": {
      "title": "Free bet"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/betting"
    },
    "texts": {
      "badge": "Free Bet",
      "title": "Доступен free bet",
      "subtitle": "Используйте бонус на сайте",
      "finalCta": "Забрать free bet"
    }
  },
  "betting_odds_countdown": {
    "type": "countdown",
    "meta": {
      "title": "Odds boost"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/betting"
    },
    "texts": {
      "badge": "Акция",
      "title": "Повышенный коэффициент",
      "subtitle": "Предложение доступно ограниченное время",
      "finalCta": "Перейти к ставкам"
    },
    "behavior": {
      "seconds": 45
    }
  },
  "sweep_mystery_box": {
    "type": "pick_box",
    "meta": {
      "title": "Mystery box"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/sweep"
    },
    "texts": {
      "badge": "Prize",
      "title": "Выберите одну коробку",
      "subtitle": "Внутри может быть ваш приз",
      "finalCta": "Забрать приз"
    },
    "items": [
      {
        "emoji": "🎁",
        "resultTitle": "Приз найден",
        "resultText": "Откройте детали на сайте",
        "url": "https://example.com/s1"
      },
      {
        "emoji": "🎁",
        "resultTitle": "Приз найден",
        "resultText": "Откройте детали на сайте",
        "url": "https://example.com/s2"
      },
      {
        "emoji": "🎁",
        "resultTitle": "Приз найден",
        "resultText": "Откройте детали на сайте",
        "url": "https://example.com/s3"
      }
    ]
  },
  "sweep_prize_wheel": {
    "type": "wheel",
    "meta": {
      "title": "Prize wheel"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/sweep"
    },
    "texts": {
      "badge": "Prize Wheel",
      "title": "Крутите колесо",
      "subtitle": "Проверьте, какой приз выпадет",
      "primaryCta": "Крутить",
      "resultTitle": "Приз найден",
      "resultText": "Откройте детали на сайте",
      "finalCta": "Забрать"
    },
    "behavior": {
      "rotation": 1830
    }
  },
  "sweep_survey_3q": {
    "type": "survey",
    "meta": {
      "title": "Survey"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/sweep"
    },
    "behavior": {
      "resultBeforeRedirect": true
    },
    "texts": {
      "badge": "Survey",
      "subtitle": "Ответьте на 3 вопроса",
      "resultTitle": "Вы допущены к участию",
      "resultText": "Откройте детали на сайте",
      "finalCta": "Получить шанс"
    },
    "questions": [
      {
        "title": "Ваш возраст?",
        "options": [
          {
            "label": "18–25"
          },
          {
            "label": "26–35"
          },
          {
            "label": "36+"
          }
        ]
      },
      {
        "title": "Часто участвуете в акциях?",
        "options": [
          {
            "label": "Да"
          },
          {
            "label": "Иногда"
          },
          {
            "label": "Редко"
          }
        ]
      },
      {
        "title": "Готовы узнать результат?",
        "options": [
          {
            "label": "Да"
          },
          {
            "label": "Показать"
          }
        ]
      }
    ]
  },
  "nutra_problem_solution_quiz": {
    "type": "quiz",
    "meta": {
      "title": "Quiz"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/nutra"
    },
    "behavior": {
      "resultBeforeRedirect": true
    },
    "texts": {
      "badge": "Quiz",
      "subtitle": "Ответьте на несколько вопросов",
      "resultTitle": "Рекомендация готова",
      "resultText": "Откройте решение на сайте",
      "finalCta": "Посмотреть решение"
    },
    "questions": [
      {
        "title": "Что вас интересует?",
        "options": [
          {
            "label": "Общий тонус"
          },
          {
            "label": "Повседневный комфорт"
          },
          {
            "label": "Уход за собой"
          }
        ]
      },
      {
        "title": "Как часто ищете такие решения?",
        "options": [
          {
            "label": "Часто"
          },
          {
            "label": "Иногда"
          },
          {
            "label": "Редко"
          }
        ]
      },
      {
        "title": "Хотите увидеть рекомендацию?",
        "options": [
          {
            "label": "Да"
          },
          {
            "label": "Показать"
          }
        ]
      }
    ]
  },
  "nutra_before_after_story": {
    "type": "before_after",
    "meta": {
      "title": "Before / After"
    },
    "assets": {
      "background": "./assets/bg.svg",
      "beforeImage": "./assets/before.svg",
      "afterImage": "./assets/after.svg"
    },
    "links": {
      "primary": "https://example.com/nutra"
    },
    "texts": {
      "badge": "Story",
      "title": "История результата",
      "subtitle": "Наглядный пример использования",
      "beforeLabel": "До",
      "afterLabel": "После",
      "storyText": "Здесь можно подставить краткую историю, описание или пользовательский опыт. Без медицинских обещаний.",
      "finalCta": "Посмотреть продукт"
    }
  },
  "nutra_discount_timer": {
    "type": "product_timer",
    "meta": {
      "title": "Discount"
    },
    "assets": {
      "background": "./assets/bg.svg",
      "productImage": "./assets/product.svg"
    },
    "links": {
      "primary": "https://example.com/nutra"
    },
    "texts": {
      "badge": "Скидка",
      "title": "Специальное предложение",
      "subtitle": "Предложение действует ограниченное время",
      "finalCta": "Получить скидку"
    },
    "behavior": {
      "seconds": 45
    }
  },
  "finance_loan_calculator": {
    "type": "calculator",
    "meta": {
      "title": "Loan calculator"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/finance"
    },
    "texts": {
      "badge": "Calculator",
      "title": "Рассчитайте условия",
      "subtitle": "Укажите сумму и срок",
      "amountPlaceholder": "Сумма",
      "monthsPlaceholder": "Срок (месяцы)",
      "primaryCta": "Рассчитать",
      "resultTitle": "Примерные условия",
      "kvAmount": "Сумма",
      "kvMonths": "Срок",
      "kvPayment": "Платёж",
      "finalCta": "Проверить условия"
    },
    "behavior": {
      "monthlyRate": 0.12
    }
  },
  "finance_approval_check": {
    "type": "approval",
    "meta": {
      "title": "Approval check"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/finance"
    },
    "behavior": {
      "resultBeforeRedirect": true
    },
    "texts": {
      "badge": "Проверка",
      "subtitle": "Ответьте на 3 коротких вопроса",
      "resultTitle": "Предварительная проверка завершена",
      "resultText": "Откройте доступные предложения",
      "finalCta": "Проверить предложение"
    },
    "questions": [
      {
        "title": "Нужна ли вам сумма до 100 000?",
        "options": [
          {
            "label": "Да"
          },
          {
            "label": "Нет"
          }
        ]
      },
      {
        "title": "Какой срок вас интересует?",
        "options": [
          {
            "label": "До 3 мес"
          },
          {
            "label": "До 6 мес"
          },
          {
            "label": "Больше"
          }
        ]
      },
      {
        "title": "Готовы посмотреть варианты?",
        "options": [
          {
            "label": "Да"
          },
          {
            "label": "Показать"
          }
        ]
      }
    ]
  },
  "utility_device_check": {
    "type": "result_check",
    "meta": {
      "title": "Device check"
    },
    "assets": {
      "background": "./assets/bg.svg"
    },
    "links": {
      "primary": "https://example.com/utility"
    },
    "texts": {
      "badge": "Scan",
      "title": "Проверка устройства",
      "subtitle": "Подождите, система анализирует данные",
      "resultTitle": "Проверка завершена",
      "resultText": "Результат доступен на следующем шаге",
      "finalCta": "Открыть результат"
    },
    "behavior": {
      "steps": [
        "Запуск проверки",
        "Проверка совместимости",
        "Поиск рекомендаций",
        "Подготовка результата"
      ]
    }
  }
};
