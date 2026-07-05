#!/usr/bin/env node

const { Command } = require('commander');
const { execSync } = require('child_process');
const net = require('net');
const os = require('os');

const program = new Command();

program
  .name('portcheck')
  .description('Check which ports are in use, what\'s listening, and detect conflicts before starting dev servers')
  .version('1.0.0');

// ─── Helpers ────────────────────────────────────────────────────────────────

const COMMON_PORTS = [
  { port: 80, service: 'HTTP' },
  { port: 443, service: 'HTTPS' },
  { port: 3000, service: 'React / Next.js / Express (dev)' },
  { port: 3001, service: 'React (alternate)' },
  { port: 4000, service: 'Phoenix / Rails / Express' },
  { port: 5000, service: 'Flask / Gunicorn / ASP.NET' },
  { port: 5173, service: 'Vite (dev)' },
  { port: 6006, service: 'Storybook' },
  { port: 8000, service: 'Django / PHP / Simple HTTP' },
  { port: 8080, service: 'Alternative HTTP / Jenkins / Tomcat' },
  { port: 8443, service: 'HTTPS (alt)' },
  { port: 9000, service: 'SonarQube / PHP-FPM' },
  { port: 3306, service: 'MySQL / MariaDB' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 6379, service: 'Redis' },
  { port: 27017, service: 'MongoDB' },
  { port: 9200, service: 'Elasticsearch' },
  { port: 9092, service: 'Kafka' },
  { port: 11434, service: 'Ollama (LLM)' },
  { port: 4317, service: 'OpenTelemetry gRPC' },
  { port: 4318, service: 'OpenTelemetry HTTP' },
];

function checkPortTCP(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function checkPorts(ports) {
  const results = [];
  for (const port of ports) {
    const free = await checkPortTCP(port);
    results.push({ port, free });
  }
  return results;
}

function getPIDInfo() {
  const platform = os.platform();
  const info = {};

  try {
    if (platform === 'win32') {
      const output = execSync('netstat -ano', { encoding: 'utf-8', timeout: 5000 });
      const lines = output.split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/(\S+)\s+(\S+):(\d+)\s+\S+\s+(\S+)\s+(\d+)/);
        if (match) {
          const [, proto, addr, port, state, pid] = match;
          if (addr === '0.0.0.0' || addr === '127.0.0.1' || addr === '[::]') {
            const p = parseInt(port, 10);
            if (!info[p]) info[p] = [];
            info[p].push({ proto, state, pid: parseInt(pid, 10) });
          }
        }
      }
    } else {
      // Linux / macOS
      const output = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
      const lines = output.split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/:(\d+)\s+.*?(?:pid=(\d+)|(\d+)\/(\S+))/);
        if (match) {
          const port = parseInt(match[1], 10);
          const pid = parseInt(match[2] || match[3], 10);
          if (!info[port]) info[port] = [];
          info[port].push({ proto: 'tcp', state: 'LISTEN', pid, process: match[4] || '' });
        }
      }
    }
  } catch {
    // netstat/ss not available — fall back to TCP probes only
  }

  return info;
}

// ─── list ───────────────────────────────────────────────────────────────────

program
  .command('list')
  .description('List all listening ports and services')
  .option('-c, --common', 'Show only common dev ports', false)
  .option('-j, --json', 'Output as JSON', false)
  .option('-p, --port <range>', 'Show ports in range (e.g., 3000-4000)')
  .action(async (opts) => {
    console.log(`\n🔌 Port Check — Listening Ports\n`);

    const pidInfo = getPIDInfo();

    if (opts.common) {
      // Check only common dev ports
      const ports = COMMON_PORTS.map((p) => p.port);
      const results = await checkPorts(ports);
      console.log('  Common Dev Ports:\n');
      for (const { port, free } of results) {
        const known = COMMON_PORTS.find((p) => p.port === port);
        const icon = free ? '🟢' : '🔴';
        const status = free ? 'FREE' : 'IN USE';
        const extra = !free && pidInfo[port] ? ` (PID: ${pidInfo[port][0].pid})` : '';
        console.log(`  ${icon} ${String(port).padEnd(7)} ${status.padEnd(8)} ${known ? known.service : ''}${extra}`);
      }
      console.log('');
      return;
    }

    // Range mode
    if (opts.port) {
      const [start, end] = opts.port.split('-').map(Number);
      if (isNaN(start) || isNaN(end) || start > end) {
        console.error('Error: Invalid port range. Use format: 3000-4000');
        process.exit(1);
      }
      const range = [];
      for (let p = start; p <= end; p++) range.push(p);
      const results = await checkPorts(range);
      const inUse = results.filter((r) => !r.free);

      console.log(`  Port range: ${start}–${end}\n`);
      if (opts.json) {
        console.log(JSON.stringify(results.map((r) => ({ port: r.port, free: r.free })), null, 2));
      } else {
        if (inUse.length === 0) {
          console.log('  🎉 All ports in range are free!\n');
        } else {
          for (const { port, free } of results) {
            if (!free) {
              const pInfo = pidInfo[port];
              console.log(`  🔴 ${port} — IN USE${pInfo ? ` (PID: ${pInfo[0].pid})` : ''}`);
            }
          }
          console.log(`\n  Summary: ${inUse.length} in use, ${range.length - inUse.length} free.\n`);
        }
      }
      return;
    }

    // Full scan — check common ports + anything already known from netstat
    const allKnownPorts = new Set([
      ...COMMON_PORTS.map((p) => p.port),
      ...Object.keys(pidInfo).map(Number),
    ]);

    const portsToCheck = [...allKnownPorts].sort((a, b) => a - b);
    const results = await checkPorts(portsToCheck);
    const inUse = results.filter((r) => !r.free);

    if (opts.json) {
      const out = inUse.map((r) => {
        const known = COMMON_PORTS.find((p) => p.port === r.port);
        return {
          port: r.port,
          service: known ? known.service : 'unknown',
          pid: pidInfo[r.port] ? pidInfo[r.port][0].pid : null,
        };
      });
      console.log(JSON.stringify(out, null, 2));
    } else {
      console.log(`  PORT      STATUS    SERVICE / PID`);
      console.log(`  ${'─'.repeat(50)}`);
      for (const { port, free } of results) {
        if (free) continue;
        const known = COMMON_PORTS.find((p) => p.port === port);
        const pInfo = pidInfo[port];
        const pidStr = pInfo ? `PID:${pInfo[0].pid}` : 'unknown';
        console.log(`  🔴 ${String(port).padEnd(10)} IN USE   ${(known ? known.service : pidStr)}`);
      }
    }

    console.log(`\n📊 ${inUse.length} port(s) in use, ${results.length - inUse.length} available.\n`);
  });

// ─── find ───────────────────────────────────────────────────────────────────

program
  .command('find <port>')
  .description('Check if a specific port is in use and show details')
  .action(async (portStr) => {
    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Error: Invalid port number (1-65535)');
      process.exit(1);
    }

    console.log(`\n🔍 Checking port: ${port}\n`);

    const free = await checkPortTCP(port);
    const pidInfo = getPIDInfo();
    const known = COMMON_PORTS.find((p) => p.port === port);

    if (free) {
      console.log(`  🟢 Port ${port} is FREE`);
      if (known) console.log(`  ℹ️  Commonly used by: ${known.service}`);
    } else {
      console.log(`  🔴 Port ${port} is IN USE`);
      if (known) console.log(`  ℹ️  Commonly used by: ${known.service}`);
      if (pidInfo[port]) {
        console.log(`  📋 Details:`);
        for (const entry of pidInfo[port]) {
          console.log(`     • Protocol: ${entry.proto}, State: ${entry.state}, PID: ${entry.pid}`);
          if (entry.process) console.log(`       Process: ${entry.process}`);
        }
      }
    }

    console.log('');
  });

// ─── free ───────────────────────────────────────────────────────────────────

program
  .command('free <port>')
  .description('Find the next free port starting from the given port')
  .option('-n, --count <n>', 'Number of free ports to find', '1')
  .action(async (portStr, opts) => {
    const startPort = parseInt(portStr, 10);
    const count = parseInt(opts.count, 10) || 1;

    if (isNaN(startPort) || startPort < 1 || startPort > 65535) {
      console.error('Error: Invalid port number (1-65535)');
      process.exit(1);
    }

    if (count < 1 || count > 50) {
      console.error('Error: Count must be between 1 and 50');
      process.exit(1);
    }

    console.log(`\n🔍 Finding ${count} free port(s) starting from ${startPort}...\n`);

    const freePorts = [];
    let current = startPort;

    while (freePorts.length < count && current <= 65535) {
      const free = await checkPortTCP(current);
      if (free) freePorts.push(current);
      current++;
    }

    if (freePorts.length < count) {
      console.log(`  ⚠️  Only found ${freePorts.length} free port(s) before hitting the port limit.\n`);
    }

    for (const port of freePorts) {
      const known = COMMON_PORTS.find((p) => p.port === port);
      console.log(`  🟢 ${port}${known ? ` (${known.service})` : ''}`);
    }

    if (freePorts.length === 1) {
      console.log(`\n  💡 Use: PORT=${freePorts[0]} npm run dev\n`);
    }

    // Also show as JSON for scripting
    console.log(JSON.stringify(freePorts));
    console.log('');
  });

program.parse(process.argv);
