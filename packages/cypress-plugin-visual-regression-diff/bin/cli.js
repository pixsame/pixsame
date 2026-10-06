#!/usr/bin/env node
require('../dist/migrate.js')
  .main(process.argv.slice(2))
  .then((code) => process.exit(code));
