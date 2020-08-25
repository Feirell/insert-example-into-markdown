#  insert-filecontent-into-markdown

This package is a markdown postprocessor which is meant to help with creating and maintain markdown files which contain the content other files as code blocks.

## usage

You just write your markdown and put placeholder where you want to put other files content.

The overwrite / create behavior is driven by a internal ruleset which is based on the input filenames.
If your file is named `template.*.md` this tool will create a corresponding `*.md` which is handy if you only want to include the `*.template.md` file into your code repository. If you list a file which does not fit this pattern it will replace this file with the generated version.

The full syntax is

~~~ md 
 <!-- USEFILE: <filename>[; <custom js preprocessor>] -->
```<languageTag>
```
~~~

> Remove the leading space before the `<!--`.

> The preprocessor, codeblock and language tag are optional, if you provide no language tag, the file extension will be use.

### example

This is an example of the usage of this package with the `*.template.md` naming.

<!-- USEFILE: example\template.example.md -->
~~~ md
# This is an example file


<!-- USEFILE: test.txt -->

This is some other text.

This tool will infer the type of the inserted code from the file ending, if you explicitly add a code block it will use the given type.

<!-- USEFILE: test.txt -->```js```
<!-- USEFILE: test.txt; str => str.replace('text', 'other text') -->
~~~
*You can find this in `example\template.example.md`*

Which results in

<!-- USEFILE: example\example.md -->
~~~ md
# This is an example file


<!-- USEFILE: test.txt -->
``` txt
This is some text!
```
*You can find this in `test.txt`*

This is some other text.

This tool will infer the type of the inserted code from the file ending, if you explicitly add a code block it will use the given type.

<!-- USEFILE: test.txt -->``` js
This is some text!
```
*You can find this in `test.txt`*

<!-- USEFILE: test.txt; str => str.replace('text', 'other text') -->``` txt
This is some other text!
```
*You can find this in `test.txt`*

~~~
*You can find this in `example\example.md`*

Actually this README uses the template alternative.

### preprocessor

You can provide custom processors which will be called on each code block inserted. There are three ways to define those.

1. One is to attach them to the comment block, like so: `<!-- USEFILE: ./some-path.js; str => str.slice(0, 20)-->` (have a look at the `README.template.md` where this is also used).
2. Another is to provided it with the `--preprocessor` CLI option (see below).
3. The last one is to provide a file path with the `--preprocessorPath` CLI option (see below).

They will be called in this order. In each case the function has the following signature:


<!-- USEFILE: index.ts; str => {
    const m = /interface Processor .+?\}/s.exec(str);
    return m? m[0]: str;
} -->
``` ts
interface Processor {
  (
    snippet: string,
    inputPath: string,
    outputPath: string,
    replacePath: string
  ): string;
}
```
*You can find this in `index.ts`*

## CLI

This CLI is exposed in with two command names `insert-filecontent-into-markdown` and `ifim` as a shortcut.

This package provides the following command line options:

### `insert-filecontent-into-markdown file-a.md`

This command will lookup `file-a.md` and process it according to the rules stated above.

### `insert-filecontent-into-markdown --add-location-notice file-a.md`

This will insert a notice (like the one you can see above) at the bottom of the inserted codeblocks.
You should add an `--` before your files if you have any files beginning with `-` or `--`.

### `insert-filecontent-into-markdown --preprocess "str => str.replace('str', 'another str')"`

You can provide a custom preprocessor which will be called for each string which is inserted into the file.

> You can provide this option multiple time, in which case each processor will be called in the specified order.

### `insert-filecontent-into-markdown --preprocessPath "./my-preproc-file"`

You can also put your preprocessor into a file. This file will be `require()` and the returned value will be used as processor you you should default export your function like so `module.exports = str => str.replace('str', 'another str')`.

> You can provide this option multiple time, in which case each processor will be called in the specified order but after the specified `--preprocess` preprocessor.

### `insert-filecontent-into-markdown README.md --add-location-notice --paths '[["test.x","test.y"]]'`

This allows you to define additional file inputs with their file output. The value passed for paths has to be a two dimensional array, in which you provide arrays with the length of two, where the first element is the source file and the second is the destination file.

## using this to insert markdown into markdown

Ironically this package has a caveat for markdown insertions. Use this with caution if your inserted markdown contains code blocks (```) and you are using the replacing approach.