# logs-parser

Simple data extraction from Spacemesh full node logs written
in dependency free JavaScript.

## Requirements

- Node.js version 10+

## Usage

Parse logs produced by a Spacemesh full node to produce a csv file
with the fields `account, rewards, amount, out_txs, in_txs`.

```bash
./rewards.js [input file] [output file]
```

The output file defaults to `logs.csv`.
