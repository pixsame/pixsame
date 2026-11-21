#!/usr/bin/env node
import { run } from './cli';

run(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exit(2);
  },
);
