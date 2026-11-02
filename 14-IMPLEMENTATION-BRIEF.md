# 14. Краткий промпт/бриф для разработчика или coding agent

Создай production-ready веб-приложение по документации этого репозитория.

## Технологии

React + TypeScript + Vite, Firebase Auth/Firestore/Functions v2/Hosting/App Check, Firebase Emulator Suite, Zod, Vitest, Playwright. Используй отдельные Firebase projects для dev/staging/prod.

## Обязательная функциональность

- роли admin/teacher/student;
- классы и безопасные приглашения;
- 5 режимов формирования работ: full, blocks, selected, random, retry mistakes;
- сроки, таймер, лимит попыток, домашние задания;
- 5 политик показа ответов;
- автосохранение и серверная сдача;
- А=1, Б=2, полный максимум 62;
- точный lookup 62→100 из JSON;
- нормализация Б и ручной review;
- кабинет учителя, ошибки, аналитика, экспорт;
- мобильность и WCAG 2.1 AA.

## Запреты

- не помещать правильные ответы в web bundle/public Firestore;
- не доверять клиентскому времени, роли, баллам или статусу;
- не использовать процент неполного теста как официальный тестовый балл;
- не публиковать OCR-контент до статуса verified;
- не коммитить service account, секреты, персональные данные и приватные ключи.

## Порядок реализации

1. Shared types/schemas/config.
2. Emulator и rules tests.
3. Auth/role guards.
4. Classes/invitations.
5. Content/assignments.
6. Attempts/scoring/feedback.
7. Teacher results/review/export.
8. E2E/accessibility/security.
9. Staging и production deployment.

Каждый PR должен содержать тесты, миграционные заметки и обновление документации. Не менять контракты модели данных без ADR/версии.
