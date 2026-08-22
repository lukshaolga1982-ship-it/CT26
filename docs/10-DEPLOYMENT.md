# 10. GitHub и развёртывание Firebase

## Репозиторий

Рекомендуемая структура реализации:

```text
apps/web/                 React/Vite
functions/src/            Cloud Functions v2
packages/shared/          types, schemas, scoring contracts
content/public/           разрешённый публичный банк
scripts/                  import/validation/admin tools
docs/                     этот комплект
firebase.json
firestore.rules
firestore.indexes.json
storage.rules
```

В `.gitignore`: `.env*` кроме `.env.example`, service-account files, private answer keys, exports, original scans, emulator data.

## Firebase setup

1. Создать отдельные проекты dev/staging/prod.
2. Включить Auth providers.
3. Создать Firestore в выбранном регионе.
4. Включить Functions/Hosting и при необходимости Storage.
5. Зарегистрировать Web App.
6. Настроить App Check (reCAPTCHA Enterprise рекомендуем для production).
7. Добавить budget alerts.

Cloud Functions обычно требуют billing-enabled/Blaze project. Проверить актуальные условия Firebase перед запуском.

## Переменные

Публичная Firebase web config не является серверным секретом, но доступ защищают Rules и App Check. Серверные секреты — только Secret Manager. Никогда не коммитить service account key.

## CI

На pull request:

- install с lockfile;
- lint/typecheck;
- unit tests;
- JSON Schema/content validation;
- emulator rules/integration tests;
- build;
- dependency/security scan.

На merge в `main`: deploy staging. Production — через GitHub Environment approval или release tag.

Использовать Workload Identity Federation/OIDC вместо долгоживущего service-account JSON, если возможно. Официальный Firebase Hosting GitHub integration допустим, но проверить scope секретов.

## Команды (пример)

```bash
npm ci
npm run lint
npm run typecheck
npm test
firebase emulators:exec "npm run test:integration"
npm run build
firebase deploy --project staging
```

Команды уточняются после создания package.json.

## Заголовки Hosting

Настроить CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS для production. CSP должна учитывать Firebase Auth endpoints и App Check.

## Release checklist

- [ ] правила протестированы emulator suite;
- [ ] App Check enforced;
- [ ] ключи недоступны клиенту;
- [ ] все 400 вопросов прошли двойную сверку;
- [ ] политика конфиденциальности опубликована;
- [ ] backup/export procedure проверена;
- [ ] бюджетные уведомления включены;
- [ ] мониторинг ошибок включён;
- [ ] учительский и ученический smoke test пройдены;
- [ ] rollback на предыдущий Hosting release проверен.
