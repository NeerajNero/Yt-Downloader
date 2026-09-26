import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'

// Single user on a private tailnet — the admin secret in the bundle is the
// accepted trade-off (see PLAN.md §5). Everything is same-origin through Caddy.
const headers = {
  'x-hasura-admin-secret': import.meta.env.VITE_HASURA_ADMIN_SECRET ?? '',
}

const httpLink = new HttpLink({ uri: '/v1/graphql', headers })

const wsProto = location.protocol === 'https:' ? 'wss' : 'ws'
const wsLink = new GraphQLWsLink(
  createClient({
    url: `${wsProto}://${location.host}/v1/graphql`,
    connectionParams: { headers },
    shouldRetry: () => true,
    retryAttempts: Infinity,
  }),
)

const link = split(
  ({ query }) => {
    const def = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  },
  wsLink,
  httpLink,
)

export const client = new ApolloClient({ link, cache: new InMemoryCache() })
