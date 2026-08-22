# 04. Модель данных Firestore

Названия коллекций приведены как контракт MVP.

## `users/{uid}`

```ts
{ displayName, emailLower, locale: "ru", createdAt, lastLoginAt, disabled }
```

Роль учителя не доверяется этому документу: она берётся из custom claims.

## `classes/{classId}`

```ts
{ teacherId, name, academicYear, archived, createdAt, updatedAt }
```

### `classes/{classId}/members/{uid}`

```ts
{ role: "student", joinedAt, status: "active" | "removed", displayNameSnapshot }
```

## `invites/{inviteId}`

```ts
{ classId, teacherId, codeHash, expiresAt, maxUses, usedCount, status, createdAt }
```

Хранить hash кода. Поиск допускается по отдельному безопасному `lookupId`, если случайный код имеет достаточную энтропию. Принятие — только функцией и транзакцией.

## `questionPublic/{questionId}`

```ts
{
  exam: "CE" | "CT", variant: 1..5, number: "A1" | "B22",
  part: "A" | "B", blockId, type,
  prompt, options?, sharedStimulusId?, sourcePages: number[],
  contentStatus: "ocr_draft" | "reviewed" | "verified" | "published",
  contentVersion, points: 1 | 2, active
}
```

## `privateAnswerKeys/{questionId}`

Только Admin SDK:

```ts
{ acceptedAnswers: string[], correctOptionId?, normalization, explanation?, keyStatus, keyVersion, reviewedBy, reviewedAt }
```

## `stimuli/{stimulusId}`

Общий текст/инструкция/изображение для группы заданий. Имеет статус и версию. Опубликованный stimulus доступен ученику только через назначенное задание либо может быть глобально читаемым, если нет ограничений.

## `assignments/{assignmentId}`

```ts
{
  teacherId, classId, title,
  mode: "full" | "blocks" | "selected" | "random" | "retry_mistakes",
  questionIds: string[], questionSnapshotsVersion: Record<string, number>,
  sourceAttemptId?, randomSeed?,
  opensAt?, dueAt?, durationMinutes?, attemptLimit,
  latePolicy, shuffleQuestions, shuffleOptions,
  feedbackPolicy, allowMistakesRetry,
  status: "draft" | "published" | "closed" | "archived",
  createdAt, publishedAt?
}
```

После публикации `questionIds` неизменяемы. Существенное изменение создаёт новую версию/назначение.

## `attempts/{attemptId}`

```ts
{
  assignmentId, classId, teacherId, studentId, attemptNo,
  status: "in_progress" | "submitted" | "expired" | "scored",
  startedAt, expiresAt?, submittedAt?, lastSavedAt,
  answerRevision, idempotencyKey,
  primaryScore?, maxPrimaryScore?, percentage?, testScore?,
  fullScaleEligible, correctCount?, reviewedCount?, scoringVersion?
}
```

### `attempts/{attemptId}/answers/{questionId}`

```ts
{
  rawAnswer, normalizedAnswer?, selectedOptionId?,
  savedAt, clientRevision,
  isCorrect?, awardedPoints?, maxPoints,
  reviewStatus: "auto" | "needs_review" | "teacher_reviewed",
  teacherComment?
}
```

До сдачи `isCorrect` и ключ не записываются клиентом. После сдачи изменение — только функцией.

## `assignmentResults/{assignmentId}/students/{uid}`

Денормализованная карточка последней/лучшей попытки для быстрой ведомости. Источником истины остаются attempts.

## `auditLogs/{eventId}`

```ts
{ actorUid, action, entityType, entityId, before?, after?, reason?, createdAt, requestId }
```

Ограничивать размер `before/after`; не включать полный текст персональных ответов без необходимости.

## Версионирование

Попытка должна проверяться по версии контента и ключа, зафиксированной при публикации. Исправление ключа не должно молча менять старые результаты: администратор запускает явный пересчёт с аудитом.

## Удаление

Удаление ученика из класса закрывает будущий доступ, но учебные результаты сохраняются согласно политике школы. Удаление аккаунта — анонимизация или полное удаление по утверждённой политике хранения.
