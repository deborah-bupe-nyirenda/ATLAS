import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudentId } from './studentIdentity.js';

test('buildStudentId keeps student confirmations separate by year and stream', () => {
  assert.equal(buildStudentId(1, 'common'), 'demo-student-1-common');
  assert.equal(buildStudentId(3, 'software-engineering'), 'demo-student-3-software-engineering');
  assert.notEqual(buildStudentId(1, 'common'), buildStudentId(2, 'common'));
  assert.notEqual(buildStudentId(3, 'software-engineering'), buildStudentId(3, 'networking-engineering'));
});
