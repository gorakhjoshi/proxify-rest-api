import { ApolloServer, gql } from 'apollo-server-micro'
import { MicroRequest } from 'apollo-server-micro/dist/types'
import axios, { AxiosError } from 'axios'
import { ServerResponse } from 'http'

const typeDefs = gql`
  type ILocality {
    category: String
    id: Int
    latitude: Float
    location: String
    longitude: Float
    postcode: Int
    state: String
  }

  type Error {
    errorMessage: String
  }

  type ResponseLocality {
    locality: [ILocality]
  }

  type ILocalities {
    localities: ResponseLocality
  }

  type Query {
    validatePostcode(queryString: String!, state: String!): ResponseUnion
  }

  union ResponseUnion = ILocalities | Error
`

interface IValidatePostcode {
  postcode: string
  queryString: string
  state: string
}

interface ILocality {
  category: string
  id: number
  latitude: number
  location: string
  longitude: number
  postcode: number
  state: string
}

interface ResponseLocality {
  locality: [ILocality]
}

interface ApiResponse {
  localities?: ResponseLocality
  error?: { errorMessage: string }
}

const resolvers = {
  Query: {
    validatePostcode: async (_: unknown, { queryString, state }: IValidatePostcode) => {
      if (!queryString || !state) {
        return { errorMessage: 'Please enter Suburb, state, or Postcode.' }
      }

      try {
        const response = await axios.get<ApiResponse>('https://digitalapi.auspost.com.au/postcode/search.json', {
          params: {
            q: queryString,
            state: state,
            excludePostBoxFlag: true,
          },
          headers: {
            'AUTH-KEY': '872608e3-4530-4c6a-a369-052accb03ca8',
          },
        })

        if (response.data && 'localities' in response.data) {
          const localities = response.data.localities
          if (!localities) return { errorMessage: 'No results found.' }
          return { localities }
        } else if (response.data.error?.errorMessage) {
          return { errorMessage: response.data.error.errorMessage || 'An error occurred while validating the address.' }
        }

        return { errorMessage: 'An error occurred while processing the request.' }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<ApiResponse>
          if (axiosError.response && axiosError.response.data && axiosError.response.data.error?.errorMessage) {
            return { errorMessage: axiosError.response.data.error.errorMessage || 'An error occurred while processing the request.' }
          }
        }

        return { errorMessage: 'An error occurred while processing the request.' }
      }
    },
  },
  ResponseUnion: {
    __resolveType(obj: { errorMessage: string; localities: ResponseLocality }) {
      if (obj.errorMessage) {
        return 'Error'
      }
      if (obj.localities) {
        return 'ILocalities'
      }
      return null
    },
  },
}

const apolloServer = new ApolloServer({ typeDefs, resolvers })

let isApolloServerStarted = false

const startServerAndCreateHandler = async () => {
  if (!isApolloServerStarted) {
    await apolloServer.start()
    isApolloServerStarted = true
  }
  return apolloServer.createHandler({ path: '/api/graphql' })
}

const handler = async (req: MicroRequest, res: ServerResponse) => {
  const apolloHandler = await startServerAndCreateHandler()
  return apolloHandler(req, res)
}

export default handler
