import type { CodegenConfig } from '@graphql-codegen/cli'

// Requires the local stack running (docker compose up) — introspects Hasura.
const config: CodegenConfig = {
  schema: [
    {
      'http://localhost:8081/v1/graphql': {
        headers: {
          'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET ?? 'devsecret',
        },
      },
    },
  ],
  documents: ['src/**/*.graphql'],
  generates: {
    'src/gql/generated.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        scalars: {
          uuid: 'string',
          timestamptz: 'string',
          jsonb: 'unknown',
          inet: 'string',
          macaddr: 'string',
          _text: 'string[]',
        },
      },
    },
  },
}

export default config
