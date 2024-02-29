#!/usr/bin/env npx ts-node

import { readFileSync } from "fs";
const stdin = readFileSync(0, "utf8");
const parameters = JSON.parse(stdin).Parameters;
console.log(
    Object.entries(parameters)
        .map(([k, v]) => `--parameters ${k}=${v}`)
        .join(" ")
);
