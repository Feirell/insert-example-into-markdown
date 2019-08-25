import { readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { EOL } from "os";

import { Error as ChainableError } from "chainable-error";

const cwd = process.cwd();

export const makePathAbsoluteToCWD = (p: string) => path.resolve(cwd, p);

export const makePathRelative = (p: string) =>
  path.relative(cwd, makePathAbsoluteToCWD(p));

const preNoticeString = "*You can find this in `";
const postNoticeString = "`*";

const codeBlockMatcher = new RegExp(
  [
    "(?<=\\n|\\r\\n|^)",
    "<!--\\s*USEFILE:\\s*((?:.|\\s)+?)(?:\\s*;\\s*(.+?))?\\s*-->",
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

const getLineEnding = string => {
  if (/\r\n/.test(string)) return "\r\n";

  if (/\r/.test(string)) return "\r";

  return EOL;
};

export interface Processor {
  (
    snippet: string,
    inputPath: string,
    outputPath: string,
    replacePath: string
  ): string;
}

const indentString = (str: string, depth = 2) => {
  const indent = "\n" + " ".repeat(depth);
  return indent + str.replace(/\n/g, indent);
};

const testFunctionalityAndWrap = (compiled: any) => {
  if (typeof compiled != "function")
    throw new Error(
      "the given processor was not a function but " + typeof compiled
    );

  return ((snippet, inputPath, outputPath, replacePath) => {
    try {
      return compiled(snippet, inputPath, outputPath, replacePath);
    } catch (e) {
      throw new ChainableError(
        "the passed pre processor threw an error for the file content fo '" +
          replacePath +
          "' string:" +
          indentString(snippet),
        e
      );
    }
  }) as Processor;
};

export const makeToProcessorFromString = (
  str: string,
  processorName: string = "processor"
) => {
  try {
    return testFunctionalityAndWrap(new Function("return " + str + ";")());
  } catch (e) {
    throw new ChainableError("could not use the given " + processorName, e);
  }
};

export const makeToProcessorFromFile = (path: string) => {
  const assembledPath = makePathAbsoluteToCWD(path);
  try {
    return testFunctionalityAndWrap(require(assembledPath));
  } catch (e) {
    throw new ChainableError(
      'could not use the given custom preprocessor file "' +
        assembledPath +
        '"',
      e
    );
  }
};

export function processPair(
  inputPath: string,
  outputPath: string,
  customPreProcessors: Processor[] = [],
  addNotice = true,
  log = false
) {
  if (log) console.group('"' + inputPath + '" --> "' + outputPath + '"');

  const fileContent = readFileSync(inputPath, "utf8");
  const lineEnding = getLineEnding(fileContent);

  const replacedContent = fileContent.replace(
    codeBlockMatcher,
    (...matching) => {
      const replacingFilePath = makePathRelative(matching[1]);
      const actualLocation = path.join(
        path.parse(inputPath).dir,
        replacingFilePath
      );

      const inlineProcessor: Processor | null = matching[2]
        ? makeToProcessorFromString(matching[2], "inline processor")
        : null;

      const initialReadSnipped = readFileSync(actualLocation, "utf8").replace(
        /\r?\n/g,
        lineEnding
      );

      const allProcessors: Processor[] = inlineProcessor
        ? [inlineProcessor, ...customPreProcessors]
        : customPreProcessors;

      const processedSnipped = allProcessors.reduce(
        (p, c) => c(p, inputPath, outputPath, actualLocation),
        initialReadSnipped
      );

      const postfix = addNotice
        ? lineEnding + preNoticeString + replacingFilePath + postNoticeString
        : "";

      const type = matching[3] || path.parse(replacingFilePath).ext.slice(1);
      const delimiter = /^\s*```?\s*$/m.test(processedSnipped) ? "~~~" : "```";

      if (log)
        console.log(
          'inserting snippet from "' +
            replacingFilePath +
            '"' +
            (allProcessors.length > 0
              ? ", applying " + allProcessors.length + " processor(s)"
              : "") +
            (allProcessors.length > 0 && processedSnipped == initialReadSnipped
              ? " which made no changes"
              : "")
        );

      return (
        "<!-- USEFILE: " +
        replacingFilePath +
        (matching[2] ? "; " + matching[2] : "") +
        " -->" +
        lineEnding +
        delimiter +
        " " +
        type +
        lineEnding +
        processedSnipped +
        lineEnding +
        delimiter +
        postfix +
        lineEnding
      );
    }
  );

  writeFileSync(outputPath, replacedContent, "utf8");

  if (log) console.groupEnd();
}
