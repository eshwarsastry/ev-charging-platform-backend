const assert = require('node:assert/strict');
const queryString = require('query-string');
assert.equal(queryString.parse('q=hello%20world').q, 'hello world');
assert.equal(queryString.stringify({ q: 'hello world' }), 'q=hello%20world');
assert.equal(typeof queryString.parse('q=%E0%A4%A').q, 'string');
const project = require('xcode').project('sample');
project.hash = { project: { objects: {} } };
assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
console.log('Patched URL decoding and Xcode UUID compatibility passed.');
