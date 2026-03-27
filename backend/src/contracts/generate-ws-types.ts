import { mkdir, writeFile } from 'node:fs/promises';

import { compile } from 'json-schema-to-typescript';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { clientEventSchemas, serverEventSchemas } from './ws/events.js';

function pascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join('');
}

async function compileSchema(name: string, schema: unknown): Promise<string> {
  return compile(schema as Parameters<typeof compile>[0], name, {
    bannerComment: '',
    style: {
      singleQuote: true,
    },
  });
}

async function buildDeclarations(
  schemas: Record<string, Parameters<typeof zodToJsonSchema>[0]>,
): Promise<string[]> {
  const declarations: string[] = [];

  for (const [eventName, schema] of Object.entries(schemas)) {
    const typeName = pascalCase(eventName);
    const jsonSchema = zodToJsonSchema(schema, {
      name: typeName,
      target: 'jsonSchema7',
      $refStrategy: 'none',
    });
    declarations.push(await compileSchema(typeName, jsonSchema));
  }

  return declarations;
}

const serverDeclarations = await buildDeclarations(serverEventSchemas);
const clientDeclarations = await buildDeclarations(clientEventSchemas);

const serverMap = Object.keys(serverEventSchemas)
  .map((eventName) => `  '${eventName}': ${pascalCase(eventName)};`)
  .join('\n');

const clientMap = Object.keys(clientEventSchemas)
  .map((eventName) => `  '${eventName}': ${pascalCase(eventName)};`)
  .join('\n');

const targetDirectory = new URL('../../../frontend/src/generated/', import.meta.url);
const targetFile = new URL('../../../frontend/src/generated/ws-contracts.ts', import.meta.url);

const output = `/* eslint-disable */
/* prettier-ignore */

${clientDeclarations.join('\n')}

${serverDeclarations.join('\n')}

export interface ClientEventMap {
${clientMap}
}

export interface ServerEventMap {
${serverMap}
}

export type ClientEvent = ClientEventMap[keyof ClientEventMap];
export type ServerEvent = ServerEventMap[keyof ServerEventMap];
`;

await mkdir(targetDirectory, { recursive: true });
await writeFile(targetFile, output);
