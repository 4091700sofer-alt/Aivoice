import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('==========================================');
console.log('Satmar Matzah Bakery - Voice POS System');
console.log('==========================================');
console.log('');

const dashboardProc = spawn('npm', ['run', 'dev:dashboard'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

setTimeout(() => {
  console.log('');
  console.log('[Agent] Starting Voice Agent (LiveKit Python)...');
  
  const agentProc = spawn('python', ['main.py', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: join(__dirname, 'agent')
  });

  agentProc.on('error', (err) => {
    console.error('[Agent] Failed to start:', err.message);
  });

  agentProc.on('exit', (code) => {
    console.log(`[Agent] Voice agent exited with code ${code}`);
  });
}, 8000);

dashboardProc.on('error', (err) => {
  console.error('[Dashboard] Failed to start:', err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\\nShutting down...');
  dashboardProc.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  dashboardProc.kill();
  process.exit(0);
});
