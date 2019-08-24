#!/usr/bin/env node

const os = require("os");
const fs = require("fs");
const path = require("path");
const minimist = require("minimist");

const makePathRelative = (p: string) =>
  path.relative(cwd, path.resolve(cwd, p));

const ADD_NOTICE = "add-location-notice";
const ADDITIONAL_PATHS = "paths";

const preNoticeString = "*You can find this in `";
const postNoticeString = "`*";

const argv = minimist(process.argv.slice(2), { boolean: ADD_NOTICE });

const unknownOption = (() => {
  const knownIdentifier = ["_", ADD_NOTICE, ADDITIONAL_PATHS];
  return (id: string) => !knownIdentifier.includes(id);
})();

const nonUsedOptions = Object.keys(argv).filter(v => unknownOption);

if (nonUsedOptions.length > 0)
  console.error(
    "Warning: You are using unknown command line options: " +
      nonUsedOptions.map(v => '"' + v + '"').join(",")
  );

let additionPaths: string[][] = [];
if (argv[ADDITIONAL_PATHS]) {
  try {
    const parsed = JSON.parse(argv[ADDITIONAL_PATHS]);
    if (!(parsed instanceof Array))
      throw new Error("the top level JSON structure needs to be an array.");

    additionPaths = parsed.map(v => ["" + v[0], "" + v[1]]);
  } catch (e) {
    const err = new Error(
      'could not parse your passed addition paths "' +
        argv[ADDITIONAL_PATHS] +
        '".'
    );
    err.stack += "\n" + e.stack;
    throw err;
  }
}

const codeBlockMatcher = new RegExp(
  [
    "(?<=\\n|\\r\\n|^)",
    "<!-- USEFILE: ?(.+?) -->",
    "(?:\\r?\\n)?",
    "(?:(?:``` ?([a-zA-Z-]*).*?```)|(?:~~~ ?([a-zA-Z-]*).*?~~~))?",
    "(?:" +
      [
        "\\r?\\n",
        preNoticeString.replace("*", "\\*"),
        ".+?",
        postNoticeString.replace("*", "\\*")
      ].join("") +
      ")?",
    "(?=\\n|\\r\\n|$)"
  ].join(""),
  "gs"
);

console.log("codeBlockMatcher", codeBlockMatcher);

const cwd = process.cwd();
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

const getLineEnding = string => {
  if (/\r\n/.test(string)) return "\r\n";

  if (/\r/.test(string)) return "\r";

  return os.EOL;
};

const replacedFiles = files
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
  .map(([inputPath, outputPath]) => {
    console.group('"' + inputPath + '" --> "' + outputPath + '"');

    const fileContent = fs.readFileSync(inputPath, "utf8");
    const lineEnding = getLineEnding(fileContent);

    const replacedContent = fileContent.replace(
      codeBlockMatcher,
      (...matching) => {
        const replacingFilePath = makePathRelative(matching[1]);
        const actualLocation = path.join(
          path.parse(inputPath).dir,
          replacingFilePath
        );

        const replaceContent = fs
          .readFileSync(actualLocation, "utf8")
          .replace(/\r?\n/g, lineEnding);

        const postfix = argv[ADD_NOTICE]
          ? lineEnding + preNoticeString + replacingFilePath + postNoticeString
          : "";

        const type = matching[2] || path.parse(replacingFilePath).ext.slice(1);
        const delimiter = /^\s*```?\s*$/m.test(replaceContent) ? "~~~" : "```";

        console.log('inserting code from "' + replacingFilePath + '"');

        return (
          "<!-- USEFILE: " +
          replacingFilePath +
          " -->" +
          lineEnding +
          delimiter +
          " " +
          type +
          lineEnding +
          replaceContent +
          lineEnding +
          delimiter +
          postfix +
          lineEnding
        );
      }
    );

    fs.writeFileSync(outputPath, replacedContent, "utf8");

    console.groupEnd();
  });
