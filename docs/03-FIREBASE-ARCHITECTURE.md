# 03. Архитектура Firebase

## Компоненты

```text
Browser (React)
  ├─ Firebase Auth
  ├─ Firestore: разрешённые чтения + черновики
  ├─ Callable/HTTP Cloud Functions: привилегированные операции
  └─ App Check
        ↓
Cloud Functions v2
  ├─ приглашения и membership
  ├─ создание/сдача попыток
  ├─ защищённая проверка
  ├─ пересчёт и ручной review
  └─ экспорт
        ↓
Firestore
  ├─ публичная часть банка
  ├─ приватные ключи
  ├─ классы/назначения
  ├─ попытки/результаты
  └─ audit logs
```

## Почему ключи проверяются сервером

Публичный GitHub, JavaScript bundle и ответы Firestore доступны анализу ученика. Поэтому правильные ответы хранятся в `privateAnswerKeys`, на которую клиентские правила дают полный запрет. Функции используют Admin SDK.

## Cloud Functions v2

Минимальный набор:

- `createInvite`, `revokeInvite`, `acceptInvite`;
- `publishAssignment`;
- `startAttempt`;
- `saveAttemptAnswers` (можно прямой Firestore write при строгих rules, но функция безопаснее для MVP);
- `submitAttempt`;
- `getAttemptFeedback`;
- `createMistakesRetry`;
- `reviewConstructedAnswer`;
- `releaseFeedback`;
- `exportResults`;
- `onUserDelete` для очистки/анонимизации.

Все callable-функции проверяют `context.auth`, App Check, роль, ownership и входные данные (например, Zod). Результаты сдачи записываются транзакцией. Повторный запрос с тем же idempotency key возвращает прежний результат.

## Authentication

- Email/Password; опционально Google.
- Email verification рекомендуется до принятия приглашения.
- Роли `admin` и `teacher` — только custom claims, назначаемые доверенной серверной процедурой.
- Статус учащегося определяется membership, а не пользовательским полем.

## Среды

Отдельные Firebase projects: `dev`, `staging`, `prod`. Никогда не подключать локальную разработку к production. `.firebaserc` с реальными ID можно не коммитить; использовать aliases.

## Emulator Suite

Локально запускать Auth, Firestore, Functions, Hosting и Storage. В CI правила Firestore проверяются через emulator и `@firebase/rules-unit-testing`.

## Регион и время

Firestore и Functions размещать в совместимом ближайшем регионе. Конкретный регион выбрать до создания Firestore: перенос позже сложен. Серверные timestamps обязательны.

## Надёжность и стоимость

- денормализовать сводные результаты, чтобы не читать все ответы для таблицы;
- пагинация и лимиты для списков;
- aggregation queries или серверные агрегаты;
- не ставить realtime listener на большие коллекции;
- Storage lifecycle для временных экспортов;
- бюджетные уведомления Google Cloud;
- Secret Manager для секретов, не `.env` в GitHub.

## Наблюдаемость

Structured logs с `requestId`, `uid`, `assignmentId`, `attemptId`; Cloud Error Reporting; алерты на рост ошибок сдачи и отказов App Check. Не писать ответы и email в обычные логи.
