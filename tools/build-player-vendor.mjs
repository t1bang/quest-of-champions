import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
await build({ stdin: { contents: "export { createClient } from '@supabase/supabase-js'", resolveDir: process.cwd() },
  bundle: true, format: 'esm', minify: true, platform: 'browser', outfile: 'vendor/supabase.js', legalComments: 'linked' });
const packages=['@supabase/supabase-js','@supabase/auth-js','@supabase/functions-js','@supabase/postgrest-js','@supabase/realtime-js','@supabase/storage-js','@supabase/phoenix','iceberg-js'];
writeFileSync('vendor/THIRD-PARTY-NOTICES.txt',packages.map(name=>`${name}\n${readFileSync(`node_modules/${name}/${name.endsWith('/phoenix')?'LICENSE.md':'LICENSE'}`,'utf8')}`).join('\n\n'));
