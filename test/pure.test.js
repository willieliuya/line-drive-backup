const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../src/Code.js'), 'utf8'));

const ts = Date.UTC(2026, 9, 5, 4, 5, 6); // 2026-10-05 12:05:06 台北
const group = { type: 'group', groupId: 'Cxxx' };

const events = [
  { type: 'message', source: group, message: { type: 'text', id: '1', text: 'hi' }, timestamp: ts },
  { type: 'message', source: { type: 'user', userId: 'U1' }, message: { type: 'image', id: '2' }, timestamp: ts },
  { type: 'message', source: group, message: { type: 'image', id: '3' }, timestamp: ts },
  { type: 'message', source: group, message: { type: 'file', id: '4', fileName: 'report.pdf' }, timestamp: ts },
  { type: 'join', source: group, timestamp: ts },
];

const picked = pickTargetEvents(events);
assert.deepStrictEqual(picked.map((e) => e.message.id), ['3', '4']);

assert.strictEqual(buildFileName(picked[0], 'image/jpeg'), '20261005_120506_3.jpg');
assert.strictEqual(buildFileName(picked[0], undefined), '20261005_120506_3');
assert.strictEqual(buildFileName(picked[1], 'application/pdf'), '20261005_120506_report.pdf');
assert.deepStrictEqual(pickTargetEvents(undefined), []);

console.log('ok');
