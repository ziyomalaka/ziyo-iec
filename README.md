# ZiyoMalaka frontend

Malaka oshirish platformasi — Next.js 16 (App Router), TypeScript, Tailwind.

Tillar: `uz`, `ru`. Admin panel o‘zbekcha.

## Talablar

- Node.js 20+
- npm

## Ishga tushirish

```bash
npm install
cp .env.local.example .env.local
```

`.env.local` ichida backend manzilini qo‘ying (`API_URL`, `NEXT_PUBLIC_API_URL`).

```bash
npm run dev
```

Brauzer: [http://localhost:3000](http://localhost:3000)

- Foydalanuvchi: `/uz/dashboard`
- Admin: `/uz/admin`

## Muhim

- `.env.local` GitHubga **kiritilmaydi** (kalitlar, token, parol).
- Backend so‘rovlari frontend proxy orqali ketadi: `NEXT_PUBLIC_API_BASE=/backend`.
- `data/*.json` — lokal nashr snapshotlari, reponing bir qismi emas.

## Skriptlar

| Buyruq | Vazifa |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run test:e2e:public` | Ochiq sahifalar smoke test |

## GitHubga yuklash

Remote yo‘q bo‘lsa:

```bash
gh repo create ziyo-malaka.uz --private --source=. --remote=origin --push
```

Yoki GitHubda bo‘sh repo ochib:

```bash
git remote add origin https://github.com/<username>/ziyo-malaka.uz.git
git push -u origin master
```
