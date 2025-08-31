import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMaintenancePlan } from '../lib/api';
import { isAdminRoute } from '../lib/routes';

test('isAdminRoute detects admin paths', () => {
  assert.ok(isAdminRoute('/maintenance'));
  assert.ok(isAdminRoute('/admin/settings'));
  assert.ok(!isAdminRoute('/projects'));
});

test('generateMaintenancePlan posts transcript', async () => {
  const calls: any[] = [];
  const globalAny: any = global;
  globalAny.fetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ link: '/tasks/demo.md' }),
    } as Response;
  };

  const res = await generateMaintenancePlan({ transcript: [{ role: 'user', content: 'test' }] });
  assert.equal(res.link, '/tasks/demo.md');
  assert.ok(calls[0].url.endsWith('/maintenance/plan'));
});
