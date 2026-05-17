to run code:

cd backend
cp .env.example .env       # fill in your Supabase + R2 + JWT values
npm install
npm run db:generate        # generate Prisma client
npm run db:migrate:dev     # run migrations against Supabase
npm run dev  