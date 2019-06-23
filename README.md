#  insert-filecontent-into-markdown

This package is a markdown postprocessor which is meant to help you create real nice markdown files but without having to copy the code of the files every time you make a change to the code.

The main idea is to place placeholder for the codeblocks into your markdown.

## usage

The basic idea is that you write your markdown file and place placeholder into it on those places where you would like to insert the codeblocks.

If your file is named `*.template.md` this tool will create a corresponding `*.md` so you could just include the `*.template.md` into your code repository. If you add a file which is just named `*.md` it will replace the content of this file (the code block will be updated with the new content).

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


### CLI

This package provides the following command line interface:

`insert-filecontent-into-markdown file-a.md`

This command will lookup `file-a.md` and process is according to the rules stated above.

`insert-filecontent-into-markdown --add-location-notice file-a.md`

This will insert a notice (like the one you are seeing here) at the bottom of the inserted codeblocks.
You should add an `--` before your files if you have any files beginning with `-` or `--`.

`README.md --add-location-notice --paths '[["test.x","test.y"]]'`

This allows you to use additional translations, the value passed for paths should be a two dimensional array, for which you provide arrays with the length two where the first element is the source file and the second is the destination file.

## using this for markdown

Ironically enough this has package a caveat for markdown insertions, use this with caution if your inserted markdown contains codeblocks.   