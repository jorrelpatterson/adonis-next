import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';
import { exec } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  const unauth = requireAdminOrCron(request); if (unauth) return unauth;
  return run();
}
export async function POST(request) {
  const unauth = requireAdminOrCron(request); if (unauth) return unauth;
  return run();
}

function run() {
  return new Promise((resolve) => {
    const script = path.join(process.cwd(), 'scripts', 'send-recruitment-drip.js');
    exec(`node ${script}`, { env: process.env, timeout: 270_000 }, (err, stdout, stderr) => {
      if (err) {
        resolve(NextResponse.json({ ok: false, error: String(err.message), stdout, stderr }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true, stdout: stdout.slice(0, 4000), stderr: stderr.slice(0, 2000) }));
      }
    });
  });
}
