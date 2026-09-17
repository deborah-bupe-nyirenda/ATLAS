import test from 'node:test';
import assert from 'node:assert/strict';
import { computingInformaticsCourseCodes, computingInformaticsCourses } from './computingInformaticsCatalogue.js';

test('defines the departmental catalogue across common and stream courses', () => {
  assert.equal(computingInformaticsCourseCodes.has('CSC 2901'), true);
  assert.equal(computingInformaticsCourseCodes.has('CSC 3742'), true);
  assert.equal(computingInformaticsCourseCodes.has('CHE 1000'), true);
  assert.equal(computingInformaticsCourses.filter((course) => course.yearOfStudy === 3).length, 11);
});