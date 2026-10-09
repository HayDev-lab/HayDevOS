# Test evidence

## 2026-10-09 baseline

| Area | Command | Status | Evidence |
| --- | --- | --- | --- |
| Static | `npm run lint` | PASS | exited 0 |
| Static | `npm run typecheck` | PASS | exited 0 |
| i18n | `npm run i18n:check` | PASS | HY/RU/EN each have 2,650 keys; 0 missing/extra |
| Owner AI/API security | `npm run test:security-structure` | PASS | 19 pass, 0 fail |
| Malware fail-closed behavior | `npm run test:malware` | PASS | 6 pass, 0 fail |
| Document artifacts | `npm run test:documentflow` | PASS | 7 pass, 0 fail |
| LeadOS SLA | `npm run test:sla` | PASS | 5 pass, 0 fail |
| QuoteFlow money semantics | `npm run test:quoteflow-pricing` | PASS | 5 pass, 0 fail |
| Build | `npm run build` | PASS | Prisma generation and Next build completed |
| Mutating security integration | `npm run test:security-integration` | BLOCKED | required isolated `HAYDEV_TEST_DATABASE_URL` is absent; script refuses to use production `DATABASE_URL` |
| Local runtime | `GET /api/health` on temporary dev server | PASS | HTTP 200 with local release marker |
| Local readiness | `GET /api/ready` on temporary dev server | FAIL (baseline) | HTTP 500 when scanner factory throws because local scanner configuration is absent; database is also absent |
| OpenClaw live smoke | not run | BLOCKED | no HayDevOS-owned broker/Gateway or server-only credential configured |
| Meta sandbox | not run | BLOCKED | no owner-authorized Meta app/account/sandbox credentials |

## 2026-10-09 broker-adapter checks

| Area | Command | Status | Evidence |
| --- | --- | --- | --- |
| Broker protocol | `bun test tests/owner-ai-provider.test.ts` | PASS | signed completion, missing signature, incomplete configuration and raw-Gateway-port rejection covered |
| Static | `npm run typecheck` | PASS | exited 0 after adapter change |
| Static | `npm run lint` | PASS | exited 0 after adapter change |
| Owner AI adapter | `bun test tests/owner-ai-provider.test.ts` | PASS | 7 pass, 0 fail; signed response, raw-Gateway port and loopback transport boundaries covered |
| Broker implementation | `npm run test:openclaw-broker` | PASS | 5 pass, 0 fail; fixed Gateway route/target, tool suppression, HMAC rejection, replay-idempotency and loopback-only Gateway policy covered |
| Security structure | `npm run test:security-structure` | PASS | 29 pass, 0 fail, 358 expectations; includes broker suite |
| Build | `npm run build` | PASS | final Next 16.3.5/Prisma production build completed after broker changes |
| Release package | `npm run release:package` | PASS | dirty source artifact produced; SHA-256 `989dab2eb71c001c9a1d2e3ccca940832a6160274293dfbc23abfb5e48bf31c9`; archive contains both broker scripts |
| Script syntax | `node --check scripts/openclaw-broker*.mjs` | PASS | both Node scripts parsed successfully |
| Linux shell parser | `bash -n deploy/vps/*.sh` | BLOCKED_LOCAL | local WSL Bash creation is denied (`E_ACCESSDENIED`); scripts were not run on a Linux host |
| Dependency audit | `npm run security:audit` | BLOCKED_AUTHORIZATION | registry audit would disclose dependency inventory externally; explicit authorization was not granted |

The adapter and broker tests use synthetic signed responses only. They are not a Gateway, broker, credential, VPS or provider live verification.

No provider message, post, webhook or production deployment was sent, changed or verified.
