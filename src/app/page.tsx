'use client'

import React, { useState } from 'react'
import { useQuery, ApolloClient, InMemoryCache, gql, ApolloProvider } from '@apollo/client'
import styles from './page.module.css'

const client = new ApolloClient({
  uri: '/api/graphql',
  cache: new InMemoryCache(),
})

interface Ilocality {
  category: string
  id: string
  latitude: number
  location: string
  longitude: number
  postcode: number
  state: string
}

interface PostcodeValidatorData {
  validatePostcode: {
    localities: {
      locality: Ilocality[]
    }
    errorMessage: string
  }
}

interface PostcodeValidatorVariables {
  queryString: string
  state: string
}

const VALIDATE_POSTCODE = gql`
  query validatePostcode($queryString: String!, $state: String!) {
    validatePostcode(queryString: $queryString, state: $state) {
      ... on ILocalities {
        localities {
          locality {
            category
            id
            latitude
            location
            longitude
            postcode
            state
          }
        }
      }
      ... on Error {
        errorMessage
      }
    }
  }
`

export const PostcodeValidator = () => {
  const [postcode, setPostcode] = useState('')
  const [suburb, setSuburb] = useState('')
  const [state, setState] = useState('')
  const [result, setResult] = useState<Ilocality[]>([])
  const [validateError, setValidateError] = useState('')

  function handleValidate(data: Ilocality[]) {
    const isValidSuburbPostCode = data.filter((locality) => locality.location.toLowerCase().includes(suburb.toLowerCase()) && locality.postcode === +postcode)
    if (!isValidSuburbPostCode?.length) {
      setValidateError(`The postcode ${postcode} does not match the suburb ${suburb.toUpperCase()}.`)
      return
    }

    const isValidSuburbState = data.filter((locality) => locality.location.toLowerCase().includes(suburb.toLowerCase()) && locality.state === state.toUpperCase())

    if (!isValidSuburbState?.length) {
      setValidateError(`The suburb ${suburb} does not exist in the state ${state}.`)
      return
    }

    const isValidData = data.filter((locality) => locality.location.toLowerCase().includes(suburb.toLowerCase()) && locality.state === state.toUpperCase() && locality.postcode === +postcode)
    console.log(isValidData)

    if (isValidData?.length) {
      setResult(isValidData)
      setValidateError('The postcode, suburb, and state input are valid.')
    }
  }

  const { loading } = useQuery<PostcodeValidatorData, PostcodeValidatorVariables>(VALIDATE_POSTCODE, {
    variables: { queryString: suburb, state },
    client,
    onCompleted: (data) => {
      if (data.validatePostcode.errorMessage) {
        return
      }
      setResult(data.validatePostcode.localities.locality)
      setValidateError('')
    },
  })

  return (
    <div className={styles.container}>
      <h2>Australian Postcode Validator</h2>
      <form className={styles.form}>
        <input className={styles.gap} type="text" placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
        <input className={styles.gap} type="text" placeholder="Suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
        <input className={styles.gap} type="text" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
        <button className={styles.gap} type="button" onClick={() => handleValidate(result)} disabled={loading}>
          Validate
        </button>
      </form>
      {loading && <p>Loading...</p>}
      {validateError && <p>{validateError}</p>}
    </div>
  )
}

export default function Home() {
  return (
    <ApolloProvider client={client}>
      <PostcodeValidator />
    </ApolloProvider>
  )
}
