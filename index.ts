#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

const makePathRelativ = p => path.relative(cwd, path.resolve(cwd, p));

const ADD_NOTICE = 'add-location-notice';
const ADDITIONAL_PATHS = 'paths';

const preNoticeString = '*You can find this in `';
const postNoticeString = '`*';

const argv = minimist(process.argv.slice(2), { boolean: ADD_NOTICE });

const nonUsedOptions = Object.keys(argv).filter(v => !['_', ADD_NOTICE, ADDITIONAL_PATHS].includes(v));

if (nonUsedOptions.length > 0)
    console.error('Warning: You are using unknown command line options: ' + nonUsedOptions.map(v => '"' + v + '"').join(','));

let additionPaths = [];
if (argv[ADDITIONAL_PATHS]) {
    try {
        const parsed = JSON.parse(argv[ADDITIONAL_PATHS]);
        if (!(parsed instanceof Array))
            throw new Error('the top level JSON structure needs to be an array.')

        additionPaths = parsed.map(v => ['' + v[0], '' + v[1]]);
    } catch (e) {
        const err = new Error('could not parse your passed addition paths "' + argv[ADDITIONAL_PATHS] + '".');
        err.stack += '\n' + e.stack;
        throw err;
    }
}

const codeBlockMatcher = new RegExp(
    [
        "(?<=\\r\\n|\\n|^)",
        "<!-- USEFILE: ?(.+?) -->",
        "(?:\\r?\\n)?",
        "(?:(?:``` ?([a-zA-Z-]*).*?```)|(?:~~~ ?([a-zA-Z-]*).*?~~~))?",
        "(?:" + [
            "\\r?\\n",
            preNoticeString.replace('*', '\\*'),
            ".+?",
            postNoticeString.replace('*', '\\*')
        ].join('') + ")?",
        "\\r?\\n",
        "(?=\\r\\n|\\n|$)"
    ].join(''), "gs"
);

const cwd = process.cwd();
const files = argv._.map(makePathRelativ);

const pathTemplateTransformer = [
    p => {
        const parsed = path.parse(p);
        const matches = /^(.+)\.template\.(?:md|MD)$/.exec(parsed.base);
        if (matches == null)
            return matches;

        return path.join(parsed.dir, matches[1] + '.md');
    },
    p => {
        const parsed = path.parse(p);
        return parsed.ext == '.md' ? p : null;
    }
];

const getLineEnding = string => {
    if (/\n\r/.exec(string))
        return '\r\n';

    if (/\r/.exec(string))
        return '\r';

    return os.EOL;
}

const replacedFiles = files
    .map(inputPath => {

        for (const transFnc of pathTemplateTransformer) {
            const outputPath = transFnc(inputPath);
            if (outputPath != null)
                return [inputPath, outputPath];
        }

        return [inputPath, null];
    })
    .filter(([inputPath, outputPath]) => {
        if (outputPath == null)
            console.log('skipped path "' + inputPath + '" since there is no output path');

        return outputPath != null
    })
    .concat(additionPaths)
    .map(([inputPath, outputPath]) => {
        console.group('"' + inputPath + '" --> "' + outputPath + '"');

        const fileContent = fs.readFileSync(inputPath, 'utf8');
        const lineEnding = getLineEnding(fileContent);

        const replacedContent = fileContent.replace(codeBlockMatcher, (...matching) => {
            const replacingFilePath = makePathRelativ(matching[1]);
            const actualLocation = path.join(path.parse(inputPath).dir, replacingFilePath);

            const replaceContent = fs.readFileSync(actualLocation, 'utf8').replace(/\r?\n/g, lineEnding);

            const postfix = argv[ADD_NOTICE] ? lineEnding + preNoticeString + replacingFilePath + postNoticeString : '';

            const type = matching[2] || path.parse(replacingFilePath).ext.slice(1);
            const delimiter = /^\s*```?\s*$/m.test(replaceContent) ? '~~~' : '```';

            console.log('inserting code from "' + replacingFilePath + '"');

            return '<!-- USEFILE: ' + replacingFilePath + ' -->' + lineEnding +
                delimiter + ' ' + type + lineEnding +
                replaceContent + lineEnding +
                delimiter + postfix + lineEnding;
        });

        fs.writeFileSync(outputPath, replacedContent, 'utf8');

        console.groupEnd();
    });