# HayDev — Repair Loop

Каждая ошибка закрывалась минимальным исправлением и отдельной проверкой. Ниже только подтверждённые дефекты приложения; ошибки временных инструментов отделены в конце.

# REPAIR CYCLE — 01
## 1. Confirmed Error
TypeScript TS18046: JSON-ответ формы имеет тип unknown.
## 2. Evidence
`node node_modules/typescript/bin/tsc --noEmit` завершился exit 2: `contact-form.tsx(29,41): 'result' is of type 'unknown'`.
## 3. Root Cause
Обращение к `result.error` без проверки формы JSON.
## 4. Minimal Fix
Сохранить unknown; проверить object, null, наличие error и тип string перед чтением.
## 5. Files Changed
`components/sections/contact-form.tsx`.
## 6. Verification
Повторный TypeScript exit 0; финальный TypeScript также exit 0.
## 7. Micro Audit
Не добавлен any; сообщение сервера сохраняется только при корректном типе.
## 8. Decision
ERROR_CLOSED.

# REPAIR CYCLE — 02
## 1. Confirmed Error
Форма не отправлялась в HTTP-превью.
## 2. Evidence
Browser console: `TypeError: crypto.randomUUID is not a function`. Успех отсутствовал, D1-запрос до исправления вернул 0 строк.
## 3. Root Cause
randomUUID доступен только в безопасном контексте; внутреннее превью использует HTTP.
## 4. Minimal Fix
При отсутствии randomUUID создать UUID v4 через crypto.getRandomValues, сохраняя криптографический источник и version/variant bits.
## 5. Files Changed
`components/sections/contact-form.tsx`.
## 6. Verification
Повторная отправка показала «ЗАЯВКА ПРИНЯТА». Независимый SELECT в локальном D1: `qa-haydev@example.com`, `stored_count=1`, `consent_version=inquiry-only-preview-v1`.
## 7. Micro Audit
HTTPS-путь остаётся стандартным. Нет Math.random, лишней зависимости или ослабления серверной UUID-валидации.
## 8. Decision
ERROR_CLOSED.

# REPAIR CYCLE — 03
## 1. Confirmed Error
Горизонтальное переполнение мобильного маршрута проекта.
## 2. Evidence
При viewport 390 px: document clientWidth 375, scrollWidth 433. DOM показал mission-map шириной 412.5 px, выходящий за контейнер.
## 3. Root Cause
Aspect-ratio 5/4 вместе с min-height 330 px задавал неявную минимальную ширину grid item.
## 4. Minimal Fix
min-width:0, mobile grid minmax(0,1fr), убрать min-height у мобильной карты; ограничить декоративную графику рамкой сцены.
## 5. Files Changed
`app/globals.css`.
## 6. Verification
Viewport 320/360/375/390/414: scrollWidth равен clientWidth. Повторено после финальных изменений типографики.
## 7. Micro Audit
Кнопки этапов остаются в DOM; горизонтальное переполнение не скрывается на всём body.
## 8. Decision
ERROR_CLOSED.

# REPAIR CYCLE — 04
## 1. Confirmed Error
На планшетной ширине графика выступала за экран на 5 px.
## 2. Evidence
Viewport 768: clientWidth 753, scrollWidth 758; DOM выявил hero-art right=757.859.
## 3. Root Cause
Увеличенная hero-графика не имела границы на планшетном breakpoint.
## 4. Minimal Fix
Локальный overflow:clip только у hero.
## 5. Files Changed
`app/globals.css`.
## 6. Verification
768: clientWidth=scrollWidth=753; финальная матрица 8/8 PASS.
## 7. Micro Audit
CTA и переключатели располагаются внутри hero; глобального скрытия overflow нет.
## 8. Decision
ERROR_CLOSED.

# REPAIR CYCLE — 05
## 1. Confirmed Error
Мобильные подписи в узлах карты подходили вплотную к нижней границе.
## 2. Evidence
Screenshot при 390 px: многострочные подписи узлов не имели достаточного нижнего отступа в строке 95 px.
## 3. Root Cause
Фиксированная высота grid rows не учитывала перенос текста.
## 4. Minimal Fix
Использовать minmax(120px,auto) для строк узлов, увеличить пояснения до 12px; основной текст секций до 16px.
## 5. Files Changed
`app/globals.css`.
## 6. Verification
Screenshot при 320 px: подписи внутри узлов с отступом. Матрица всех 8 ширин повторно PASS.
## 7. Micro Audit
Текст не обрезан и не заменён сокращениями. Дополнительная высота секции оправдана читаемостью.
## 8. Decision
ERROR_CLOSED.

# REPAIR CYCLE — 06
## 1. Confirmed Error
После закрытия правового диалога фокус возвращался на body.
## 2. Evidence
Dialog count после анимации стал 0, document.activeElement был BODY.
## 3. Root Cause
Контролируемый Dialog открывается из двух кнопок без единственного DialogTrigger.
## 4. Minimal Fix
Сохранить открывшую кнопку в ref и восстановить её фокус в onCloseAutoFocus.
## 5. Files Changed
`components/haydev.tsx`.
## 6. Verification
После Escape: dialogCount=0; focusTag=BUTTON; focusText=«Правовая информация». TypeScript exit 0.
## 7. Micro Audit
Оба инициатора используют openPrivacy; встроенный focus trap и Escape Radix сохранены.
## 8. Decision
ERROR_CLOSED.

## Неблокирующие замечания и инструментальные события

- Удалён лишний eslint-disable; повторный ESLint: exit 0, без предупреждений.
- Немедленная проверка после Escape однажды увидела анимируемый закрывающийся диалог. После завершения exit-animation count=0: FALSE_POSITIVE, отключать анимацию ради теста не потребовалось.
- Browser logs содержали ошибки browser-extension; это не ошибки сайта. Единственная подтверждённая ошибка приложения randomUUID закрыта выше.
- Shell HTTP-проверка loopback получила connection refused из-за отдельного supervised-preview окружения. API-проверки выполнены через браузерный временный QA harness: 11/11 PASS.
- После изменений HMR отдельные iframe locators устаревали; свежий DOM/перезагрузка harness восстановили проверку. Мобильное меню проверено видимыми DOM-действиями.
