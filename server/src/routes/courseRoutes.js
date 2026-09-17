import { Router } from 'express';

export function createCourseRoutes(service) {
  const router = Router();

  router.get('/student/courses/suggested', async (request, response) => {
    const { year, stream = 'common' } = request.query;
    response.json(await service.getSuggestedCourses(year, stream));
  });

  router.get('/courses/search', async (request, response) => {
    response.json(await service.searchCourses(request.query.q));
  });

  router.post('/student/courses/confirm', async (request, response) => {
    try {
      response.status(201).json(await service.confirmCourses(request.body));
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  router.get('/student/timetable', async (request, response) => {
    response.json(await service.getRelevantTimetable(request.query.studentId ?? 'demo-student'));
  });

  return router;
}