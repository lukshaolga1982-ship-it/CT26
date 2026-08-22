# 11. План разработки

## Этап 0. Подготовка

- подтвердить права на контент;
- создать Firebase dev/staging/prod;
- выбрать регион;
- завести GitHub repository, branch protection и CI.

## Этап 1. Основа

- React/TypeScript/Vite;
- Auth и маршрутизация по ролям;
- дизайн-система и layout;
- Emulator Suite;
- базовые rules tests.

## Этап 2. Классы и приглашения

- CRUD классов;
- create/revoke/accept invite;
- список участников;
- удаление/архивирование membership;
- аудит.

## Этап 3. Банк и назначения

- public/private модель банка;
- full/blocks/selected/random;
- мастер настройки сроков, таймера, попыток и feedback;
- immutable publication.

## Этап 4. Попытки и оценивание

- start/autosave/submit/expire;
- серверная проверка;
- шкала 62→100;
- результаты и политика показа;
- retry mistakes.

## Этап 5. Кабинет учителя

- ведомость;
- детализация ошибок;
- аналитика по блокам/номерам;
- ручной review;
- CSV/XLSX export.

## Этап 6. Контент

- OCR и ручная разметка 10 вариантов;
- двойная сверка;
- schema validation;
- импорт staging;
- выборочный QA и публикация.

## Этап 7. Production readiness

- accessibility и responsive QA;
- security review/rules tests;
- нагрузочное тестирование сдачи;
- App Check enforcement;
- privacy/retention/backup;
- teacher pilot и исправления.

## Приоритет MVP

P0: auth, классы, приглашения, опубликованные тесты, попытка, серверная сдача, баллы, результаты учителя.

P1: блоки, random/selected, timer, deadlines, attempt limits, feedback policies, retry mistakes, export.

P2: расширенная аналитика, XLSX, уведомления, улучшенный контент-редактор.
