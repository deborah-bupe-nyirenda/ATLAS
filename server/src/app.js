import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createMemoryStore } from './repositories/memoryStore.js';
import { createMysqlStore } from './repositories/mysqlStore.js';
import { createDatabasePool } from './database/pool.js';
import { createCourseConfirmationService } from './services/courseConfirmationService.js';
import { createCourseRoutes } from './routes/courseRoutes.js';
import { createAdminRoutes } from './routes/adminRoutes.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createTimetableRevisionService } from './services/timetableRevisionService.js';
import { createAuthService } from './services/authService.js';
import { createCourseCatalogueService } from './services/courseCatalogueService.js';

const store = process.env.DB_HOST ? createMysqlStore(createDatabasePool()) : createMemoryStore();
const service = createCourseConfirmationService(store);
const revisionService = createTimetableRevisionService(store);
const authService = createAuthService(store, process.env.JWT_SECRET ?? 'development-only-change-me');
const catalogueService = createCourseCatalogueService(store);
const app = express();

app.use(cors());
app.use(express.json());
app.get('/api/health', (_request, response) => response.json({ status: 'ok', mode: 'prototype' }));
app.use('/api/auth', createAuthRoutes(authService));
app.use('/api', createCourseRoutes(service));
app.use('/api/admin', createAdminRoutes(revisionService, authService, catalogueService));

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => console.log(`ATLAS API listening on http://localhost:${port}`));
}

export { app };