#!/usr/bin/env node

/**
 * Usage: ./rewards.js [input file] [output file]
 * The input file must be passed in and must exist.
 * The default value of the output file is logs.csv.
 *
 * MIT License
 * Copyright (c) 2020, Mark Tyneway
 */

'use strict';

const readline = require('readline');
const fs = require('fs');
const path = require('path');

let rewards = new Map();

async function main() {
  const args = process.argv.slice(2);

  if (!args[0])
    throw new Error('Must pass input log file name as first argument.');

  const input = path.resolve(args[0]);

  if (!fs.existsSync(input))
    throw new Error(`Input log file ${input} not found.`);

  let output = args[1] ? path.resolve(args[1]) : path.resolve('logs.csv');

  const fileStream = fs.createReadStream(input);

  const rl = readline.createInterface({
    input: fileStream
  });

  const writer = fs.createWriteStream(output);

  async function write(data) {
    return new Promise((resolve, reject) => {
      writer.write(data, (err) => {
        if (err)
          return reject(err);
        resolve();
      });
    });
  }

  await write('time-stamp, layer_id, reward_amount, reward_account\n');

  for await (const line of rl) {

    if (line.match(/Reward applied/)) {

      //console.log(`${line}`);

      const res = line.match(/{["\w:\s,]*}/);
      if (!res) {
        console.log('WARN: unexpected regex miss, JSON not found.');
        continue;
     }

      const data = JSON.parse(res);

      if (data.account === '0x00000') {
        continue;
      }

      if (rewards.has(data.account)) {
          rewards.set (data.account, rewards.get(data.account) + BigInt(data.reward));
      } else {
          rewards.set(data.account, BigInt(data.reward));
      }

      const words = line.split("	");
      const t = Date.parse(words[0]);
      await write(`${t}, ${data.layer_id}, ${data.reward}, ${data.account}\n`);
    }
  }

  console.log(rewards);

}

(async () => {
  await main();
})().catch(err => {
  console.log(err);
  process.exit(1);
});
