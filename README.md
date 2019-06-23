#  insert-filecontent-into-markdown

This package is a markdown postprocessor which is meant to help to create and maintain markdownfiles which contain code snippets. The main idea is that you just need to put placeholder in your markdown for the codeblocks and this tool will replace them with the actual code.

## usage

The basic idea is that you write your markdown file and place placeholder into it on those places where you would like to insert the codeblocks.

The overwrite / create behauvior is driven by a internal ruleset which is based on the input filenames. If your file is named `*.template.md` this tool will create a corresponding `*.md` which is handy if you only want to include the include the `*.template.md` into your code repository. If you add a file which is named `*.md` it will replace the content of this file (the code block will be updated with the new content).

This is an example of the usage of this package with the `*.template.md` naming.

<!-- USEFILE: example\example.template.md -->
``` md
# This is an example file


<!-- USEFILE: test.txt -->

This is some other text.

This tool will infer the type of the inserted code from the file ending, if you explicitly add a code block it will use the given type.

<!-- USEFILE: test.txt -->```js```
<!-- USEFILE: test.txt -->
```
*You can find this in `example\example.template.md`*

Actually this README uses the inplace alternativ.

## CLI

This package provides the following command line interface:

`insert-filecontent-into-markdown file-a.md`

This command will lookup `file-a.md` and process it according to the rules stated above.

`insert-filecontent-into-markdown --add-location-notice file-a.md`

This will insert a notice (like the one you can see above) at the bottom of the inserted codeblocks.
You should add an `--` before your files if you have any files beginning with `-` or `--`.

`README.md --add-location-notice --paths '[["test.x","test.y"]]'`

This allows you to use additional inputs with their output. The value passed for paths has to be a two dimensional array, in which you provide arrays with the length of two, where the first element is the source file and the second is the destination file.

## using this for markdown

Ironically enough this has package has caveat for markdown insertions, use this with caution if your inserted markdown contains codeblocks.