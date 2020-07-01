#!/usr/bin/env node

/**
 * Usage: ./rewards.js [input file] [output file]
 * The input file must be passed in and must exist.
 * The default value of the output file is logs.csv.
 *
 * MIT License
 * Copyright (c) 2020, Mark Tyneway
 * Copyright (c) 2020 Spacemesh
 */

'use strict';

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const {once} = require('events');

let accounts = new Map();

if (typeof BigInt !== 'function')
  throw new Error('Requires BigInt');

async function main() {
  const args = process.argv.slice(2);

  if (!args[0])
    throw new Error('Must pass input log file name as first argument.');

  const input = path.resolve(args[0]);

  if (!fs.existsSync(input))
    throw new Error(`Input log file ${input} not found.`);

  let output = args[1] ? path.resolve(args[1]) : path.resolve('logs.csv');

  const fileStream = fs.createReadStream(input);

  const writer = fs.createWriteStream(output);
  await write('account, rewards, amount, out_txs, in_txs\n');

  const rl = await readline.createInterface({
    input: fileStream
  });

  rl.on('line', (line) => {
    parseRewards(line);
    parseTransactions(line);
  });

  await once(rl, 'close');

  for (const [key, value] of accounts.entries()) {
    await write (`${key}, ${value.total}, ${value.amount.toString()}, ${value.out_txs}, ${value.in_txs}\n`);
  }

  async function write(data) {
    return new Promise((resolve, reject) => {
      writer.write(data, (err) => {
        if (err)
          return reject(err);
        resolve();
      });
    });
  }
}

function parseTransactions(line) {
  if (!line.match(/transaction processed/))
    return;

  const res = line.match(/{[^]*}/);
  if (!res) {
    console.log('WARN: unexpected regex miss, JSON not found.');
    return;
  }

  const data = JSON.parse(res);

  // ugly but the current tx data in the log is not valid json
  const items = data.transaction.split(', ');
  const origin = items[1].split(' ')[1];
  const recipient = items[2].split(' ')[1];

  if (accounts.has(origin)) {
    let v = accounts.get(origin);
    v.out_txs++;
    accounts.set(origin, v);
  } else {
    accounts.set(origin, {total: 0, amount: BigInt(0), in_txs: 0, out_txs: 1});
  }

  if (accounts.has(recipient)) {
    let v = accounts.get(recipient);
    v.in_txs++;
    accounts.set (recipient, v);
  } else {
    accounts.set(recipient, {total: 0, amount: BigInt(0), in_txs: 1, out_txs: 0});
  }
}

function parseRewards(line) {
  if (!line.match(/Reward applied/))
    return;

  const res = line.match(/{[^]*}/);
  if (!res) {
    console.log(`WARN: unexpected regex miss, JSON not found. ${line}`);
    return;
  }

  const data = JSON.parse(res);

  if (data.account === '0x00000') {
    return;
  }

  if (accounts.has(data.account)) {
    let v = accounts.get(data.account);
    v.total++;
    v.amount = v.amount + BigInt(data.reward);
    accounts.set (data.account, v);
  } else {
    accounts.set(data.account, {total: 0, amount: BigInt(data.reward), in_txs: 0, out_txs: 0});
  }
}

(async () => {
  await main();
})().catch(err => {
  console.log(err);
  process.exit(1);
});
