import { createMacro } from 'babel-plugin-macros';
import * as t from '@babel/types';
import { stripIndent } from 'common-tags';
import * as fs from 'fs';
import * as path from 'path';

import type { PluginPass } from '@babel/core';
import type { MacroHandler } from 'babel-plugin-macros';

/** CSS classes start with this: i.e `css-index.tsx#32:16` */
const classPrefix = 'css-';
/** Indent string for extracted CSS classes */
const cssIndent = '  ';
/** Path to CSS output file */
const outFile = 'serve/takeout.css';

const injectGlobalSnippets: string[] = [];
const cssSnippets: string[] = [];

// Need to know when Babel is done compilation. Patch process.stdout to search
// for @babel/cli. If stdout never emits a sign of running in @babel/cli then
// process.exit will be used as a fallback; which is clearly after compilation.
let runningBabelCLI = false;
process.on('exit', () => {
  if (runningBabelCLI) return;
  writeStyles();
});

// Can't `process.stdout.on('data', ...` because it's a Writeable stream
const stdoutWrite = process.stdout.write;
// @ts-ignore Typescript's never heard of wrapping overloaded functions before
process.stdout.write = (...args: Parameters<typeof process.stdout.write>) => {
  const [bufferString] = args;
  const string = bufferString.toString();
  if (string && string.startsWith('Successfully compiled')) {
    runningBabelCLI = true;
    writeStyles();
  }
  return stdoutWrite.apply(process.stdout, args);
};

const mergeTemplateExpression = (node: t.Node): string => {
  if (!t.isTaggedTemplateExpression(node)) {
    throw new Error(`Macro must be used as a tagged template and not "${node.type}"`);
  }
  let string = '';
  const { quasis, expressions } = node.quasi;
  for (let i = 0; i < expressions.length; i++) {
    string += quasis[i].value.raw;
    string += expressions[i];
  }
  // There's always one more `quasis` than `expressions`
  string += quasis[quasis.length - 1].value.raw;
  return stripIndent(string);
};

const sourceLocation = (node: t.Node, state: PluginPass) => {
  if (!node.loc) {
    throw new Error('Node didn\'t have location info as "node.loc"');
  }
  const { filename } = state;
  const { line, column } = node.loc.start;
  return `${path.basename(filename)}#${line}:${column}`;
};

const styleTakeoutMacro: MacroHandler = ({ references, state }) => {
  const { injectGlobal, css } = references;

  if (injectGlobal) injectGlobal.forEach(referencePath => {
    const { parentPath } = referencePath;
    const { node } = parentPath;
    const loc = sourceLocation(node, state);
    const styles = mergeTemplateExpression(node);
    // TODO: Do stylis work with global namespace plugin

    injectGlobalSnippets.push(`/* ${loc} */\n${styles}`);
    parentPath.remove();
  });

  if (css) css.forEach(referencePath => {
    const { parentPath } = referencePath;
    const { node } = parentPath;
    const loc = sourceLocation(node, state);
    const styles = mergeTemplateExpression(node);
    // TODO: Do stylis work with autogenerated class name

    const tag = `${classPrefix}${loc}`;
    const tagSafe = tag.replace(/([.#:])/g, (_, match) => `\\${match}`);

    const indentedStyles = cssIndent + styles.replace(/\n/g, `\n${cssIndent}`);
    cssSnippets.push(`.${tagSafe} {\n${indentedStyles}\n}`);

    parentPath.replaceWith(t.stringLiteral(tag));
  });
};

// eslint-disable-next-line prefer-template
const toBlob = (x: string[]) => x.join('\n') + '\n';
const writeStyles = () => {
  const total = injectGlobalSnippets.length + cssSnippets.length;
  console.log(`Moved ${total} snippets of CSS into:`, outFile);
  fs.writeFileSync(outFile, toBlob(injectGlobalSnippets));
  fs.appendFileSync(outFile, toBlob(cssSnippets));
};

export default createMacro(styleTakeoutMacro);
