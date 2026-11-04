# Chatbot Banque — Tableau de bord Direction (Angular POC)

Native Angular 22 rebuild of the Power BI POC (`../POC/POC.pbip`): pages **Pilotage** and **Métiers & thématiques**,
same dataset, same DAX logic, same layout and theme. No backend: an HTTP interceptor simulates the API.

## Run

```bash
npm install
```

```bash
npm start
```

Open http://localhost:4200. Demo switches (append to the URL):

| Param | Effect |
|---|---|
| `?fail=kpis,alerts` | first call of each listed endpoint fails → error card → "Réessayer" |
| `?errorRate=0.2` | every request fails with this probability |

## Data

`public/data/dataset.json` is generated from the Power BI workbook (`../POC_ChatbotBanque.zip → 01_Donnees_fictives.xlsx`):

```bash
python tools/xlsx_to_json.py
```

It also prints the golden values for Octobre 2026 (881 actifs, 6 892 questions, 58,7 %, 230/420 documents).

## Architecture

| Path | Role |
|---|---|
| `core/mock-api/engine.ts` | TypeScript port of the PBI measures (`_Mesures.tmdl`): period vs M-1 (EDATE), KPIs, activity buckets, budget projection, alerts, themes, documents |
| `core/mock-api/mock-api.interceptor.ts` | `GET /api/dashboard/{overview,kpis,activity,departments,budget,alerts,service-quality,themes,keywords,documents,documents/:id}`, random 1–3 s latency, validation, simulated errors |
| `core/services/dashboard-api.service.ts` | typed `httpResource` per endpoint, bound to the global filters (a filter change cancels the in-flight request) |
| `core/state/filter.store.ts` | month / department / granularity signals shared by both pages |
| `features/pilotage`, `features/metiers` | one component per visual; styles follow the Deneb specs of the PBI report |

Real backend: remove `mockApiInterceptor` from `app.config.ts`; the services already use `HttpClient`.

## Checks

```bash
npx ng test --watch=false
```

```bash
playwright-cli open http://localhost:4200
```

```bash
playwright-cli run-code --filename e2e/golden-path.js --raw
```

The last one drives the golden path (KPIs, department click, rapid filter changes, page switch, month change,
document dialog, reset, simulated error + retry) against the running dev server.
