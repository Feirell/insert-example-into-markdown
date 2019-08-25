#!/usr/bin/env node

import * as path from "path";
import * as minimist from "minimist";

import { Error as ChainableError } from "chainable-error";

import { processPair, makePathRelative, makePathAbsoluteToCWD } from ".";

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

let customPreProcessor = (str: string) => str;
if (argv[CUSTOM_PRE_PROCESS]) {
  try {
    const compiled = new Function("return " + argv[CUSTOM_PRE_PROCESS] + ";")();
    if (typeof compiled != "function")
      throw new Error(
        "the given " +
          CUSTOM_PRE_PROCESS +
          " was not a function but " +
          typeof compiled
      );

    if (typeof compiled("") != "string")
      throw new Error(
        "the given " +
          CUSTOM_PRE_PROCESS +
          ' does not return a string for the input ""'
      );

    customPreProcessor = str => {
      try {
        return compiled(str);
      } catch (e) {
        throw new ChainableError(
          "the passed pre processor threw an error for the string:" +
            "  " +
            str.replace(/\n/g, "  \n"),
          e
        );
      }
    };
  } catch (e) {
    throw new ChainableError(
      "could not use the given " + CUSTOM_PRE_PROCESS,
      e
    );
  }
}

if (argv[CUSTOM_PRE_PROCESS_PATH]) {
  const assembledPath = makePathAbsoluteToCWD(argv[CUSTOM_PRE_PROCESS_PATH]);
  try {
    const loaded = require(assembledPath);
    if (typeof loaded != "function")
      throw new Error(
        "the given " +
          CUSTOM_PRE_PROCESS_PATH +
          " was not a function but " +
          typeof loaded
      );

    if (typeof loaded("") != "string")
      throw new Error(
        "the given " +
          CUSTOM_PRE_PROCESS_PATH +
          ' does not return a string for the input ""'
      );

    customPreProcessor = str => {
      try {
        return loaded(str);
      } catch (e) {
        throw new ChainableError(
          'the loaded pre processor threw an error for the string "' +
            "  " +
            str.replace(/\n/g, "  \n"),
          e
        );
      }
    };
  } catch (e) {
    throw new ChainableError(
      'could not use the given custom preprocessor file "' +
        assembledPath +
        '"',
      e
    );
  }
}

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

const chainExec = <T, U, R = T>(
  continueOn: U,
  functions: ((val: T) => U | R)[]
) => (val: T) => {
  for (const fnc of functions) {
    const res = fnc(val);
    if (res !== continueOn) return res;
  }

  return continueOn;
};

const pathTemplateTransformer = chainExec<string, null>(null, [
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
    processPair(inputPath, outputPath, customPreProcessor, addNotice, true)
  );
