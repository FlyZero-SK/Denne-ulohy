import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function readRules() {
  return readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
}

test('web app requires Google authentication before loading tasks', () => {
  assert.match(html, /firebase-auth-compat\.js/);
  assert.match(html, /new firebase\.auth\.GoogleAuthProvider\(\)/);
  assert.match(html, /signInWithPopup/);
  assert.match(html, /onAuthStateChanged/);
  assert.match(html, /richard\.graczer@gmail\.com/);
  assert.match(html, /id="login-screen"/);
  assert.match(html, /id="app-shell"/);
  assert.match(html, /id="sign-out-btn"/);
});

test('Google popup is opened directly from the user click', () => {
  const match = html.match(/async function signInWithGoogle\(\)\{([\s\S]*?)\n\}/);
  assert.ok(match, 'signInWithGoogle function is missing');
  assert.doesNotMatch(match[1], /await auth\.setPersistence/);
  assert.match(match[1], /await auth\.signInWithPopup\(googleProvider\)/);
});

test('Firestore rules require the one verified Google account', () => {
  const rules = readRules();
  assert.match(rules, /request\.auth\s*!=\s*null/);
  assert.match(rules, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rules, /request\.auth\.token\.email\s*==\s*['"]richard\.graczer@gmail\.com['"]/);
  assert.match(rules, /match \/tasks\/\{taskId\}/);
  assert.doesNotMatch(rules, /allow\s+(read|write|read,\s*write|write,\s*read)\s*:\s*if\s+true/);
});

test('Firestore rules validate task fields and deny every other collection', () => {
  const rules = readRules();
  for (const field of ['text', 'created_at', 'done', 'priority', 'category']) {
    assert.match(rules, new RegExp(`['"]${field}['"]`));
  }
  assert.match(rules, /hasOnly/);
  assert.match(rules, /match \/\{document=\*\*\}/);
  assert.match(rules, /allow read, write: if false/);
});
