#  insert-filecontent-into-markdown

This package is a markdown postprocessor which is meant to help with creating and maintain markdown files which contain the content other files as code blocks.

## usage

You just write your markdown and put placeholder where you want to put other files content.

The overwrite / create behavior is driven by a internal ruleset which is based on the input filenames.
If your file is named `*.template.md` this tool will create a corresponding `*.md` which is handy if you only want to include the `*.template.md` file into your code repository. If you list a file which does not fit this pattern it will replace this file with the generated version.

### example

This is an example of the usage of this package with the `*.template.md` naming.

<!-- USEFILE: example\example.template.md -->

Which results in

<!-- USEFILE: example\example.md -->

Actually this README uses the template alternative.

## CLI

This package provides the following command line interface:

### `insert-filecontent-into-markdown file-a.md`

This command will lookup `file-a.md` and process it according to the rules stated above.

### `insert-filecontent-into-markdown --add-location-notice file-a.md`

This will insert a notice (like the one you can see above) at the bottom of the inserted codeblocks.
You should add an `--` before your files if you have any files beginning with `-` or `--`.

### `README.md --add-location-notice --paths '[["test.x","test.y"]]'`

This allows you to define additional file inputs with their file output. The value passed for paths has to be a two dimensional array, in which you provide arrays with the length of two, where the first element is the source file and the second is the destination file.

## using this to insert markdown into markdown

Ironically this package has a caveat for markdown insertions. Use this with caution if your inserted markdown contains code blocks (```) and you are using the replacing approach.