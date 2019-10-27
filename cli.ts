#!/usr/bin/env node

import * as path from "path";
import * as minimist from "minimist";

import { Error as ChainableError } from "chainable-error";

import {
  processPair,
  makePathRelative,
  makeToProcessorFromString
} from "./index";

const ADD_NOTICE = "add-location-notice";
const ADDITIONAL_PATHS = "paths";
const CUSTOM_PRE_PROCESS = "preprocess";
const CUSTOM_PRE_PROCESS_PATH = "preprocessPath";

const argv = minimist(process.argv.slice(2), { boolean: ADD_NOTICE });

const unknownOption = (() => {
  const knownIdentifier = [
    "_",
    ADD_NOTICE,
    ADDITIONAL_PATHS,
    CUSTOM_PRE_PROCESS,
    CUSTOM_PRE_PROCESS_PATH
  ];
  return (id: string) => !knownIdentifier.includes(id);
})();

const nonUsedOptions = Object.keys(argv).filter(unknownOption);

if (nonUsedOptions.length > 0)
  console.error(
    "Warning: You are using unknown command line options: " +
      nonUsedOptions.map(v => '"' + v + '"').join(",")
  );

const ensureArray = <T>(arg: T | T[]) => (Array.isArray(arg) ? arg : [arg]);

let customPreProcessors = [];

if (argv[CUSTOM_PRE_PROCESS])
  for (const cpp of ensureArray(argv[CUSTOM_PRE_PROCESS]))
    customPreProcessors.push(makeToProcessorFromString(cpp));

if (argv[CUSTOM_PRE_PROCESS_PATH])
  for (const cppp of ensureArray(argv[CUSTOM_PRE_PROCESS_PATH]))
    customPreProcessors.push(makeToProcessorFromString(cppp));

let additionPaths: string[][] = [];
if (argv[ADDITIONAL_PATHS]) {
  try {
    const parsed = JSON.parse(argv[ADDITIONAL_PATHS]);
    if (!(parsed instanceof Array))
      throw new Error("the top level JSON structure needs to be an array.");

    additionPaths = parsed.map(v => ["" + v[0], "" + v[1]]);
  } catch (e) {
    const err = new ChainableError(
      'could not parse the addition paths "' + argv[ADDITIONAL_PATHS] + '".',
      e
    );
    throw err;
  }
}

const files = argv._.map(makePathRelative) as string[];

const getFirstNonContinue = <T, U, R = T>(
  continueOn: U,
  functions: ((val: T) => U | R)[]
) => (val: T) => {
  for (const fnc of functions) {
    const res = fnc(val);
    if (res !== continueOn) return res;
  }

  return continueOn;
};

const pathTemplateTransformer = getFirstNonContinue<string, null>(null, [
  p => {
    const parsed = path.parse(p);
    const matches = /^(.+)\.template\.(?:md)$/i.exec(parsed.base);
    if (matches == null) return null;

    return path.join(parsed.dir, matches[1] + ".md");
  },
  p => {
    const parsed = path.parse(p);
    return /md/i.test(parsed.ext) ? p : null;
  }
]);

const addNotice = argv[ADD_NOTICE];

files
  .map(inputPath => {
    return [inputPath, pathTemplateTransformer(inputPath)];
  })
  .filter(([inputPath, outputPath]) => {
    if (outputPath == null)
      console.log(
        'skipped path "' + inputPath + '" since there is no output path'
      );

    return outputPath != null;
  })
  .concat(additionPaths)
  .forEach(([inputPath, outputPath]) =>
    processPair(inputPath, outputPath, customPreProcessors, addNotice, true)
  );
