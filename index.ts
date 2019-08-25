import { readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { EOL } from "os";

const cwd = process.cwd();

export const makePathAbsoluteToCWD = (p: string) => path.resolve(cwd, p);

export const makePathRelative = (p: string) =>
  path.relative(cwd, makePathAbsoluteToCWD(p));

const preNoticeString = "*You can find this in `";
const postNoticeString = "`*";

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

const getLineEnding = string => {
  if (/\r\n/.test(string)) return "\r\n";

  if (/\r/.test(string)) return "\r";

  return EOL;
};

export function processPair(
  inputPath: string,
  outputPath: string,
  customPreProcessor = (str: string) => str,
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

      const replaceContent = customPreProcessor(
        readFileSync(actualLocation, "utf8").replace(/\r?\n/g, lineEnding)
      );

      const postfix = addNotice
        ? lineEnding + preNoticeString + replacingFilePath + postNoticeString
        : "";

      const type = matching[2] || path.parse(replacingFilePath).ext.slice(1);
      const delimiter = /^\s*```?\s*$/m.test(replaceContent) ? "~~~" : "```";

      if (log)
        console.log('inserting snippet from "' + replacingFilePath + '"');

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

  writeFileSync(outputPath, replacedContent, "utf8");

  if (log) console.groupEnd();
}
