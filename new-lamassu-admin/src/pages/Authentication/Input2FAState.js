import { useMutation, useLazyQuery } from '@apollo/react-hooks'
import { makeStyles } from '@material-ui/core/styles'
import gql from 'graphql-tag'
import React, { useContext, useState } from 'react'
import { useHistory } from 'react-router-dom'

import { AppContext } from 'src/App'
import { Button } from 'src/components/buttons'
import { CodeInput } from 'src/components/inputs/base'
import { H2, P } from 'src/components/typography'

import styles from './Login.styles'

const useStyles = makeStyles(styles)

const INPUT_2FA = gql`
  mutation input2FA(
    $username: String!
    $password: String!
    $code: String!
    $rememberMe: Boolean!
  ) {
    input2FA(
      username: $username
      password: $password
      code: $code
      rememberMe: $rememberMe
    )
  }
`

const GET_USER_DATA = gql`
  {
    userData {
      id
      username
      role
    }
  }
`

const Input2FAState = ({
  twoFAField,
  onTwoFAChange,
  clientField,
  passwordField,
  rememberMeField
}) => {
  const classes = useStyles()
  const history = useHistory()
  const { setUserData } = useContext(AppContext)

  const [invalidToken, setInvalidToken] = useState(false)

  const handle2FAChange = value => {
    onTwoFAChange(value)
    setInvalidToken(false)
  }

  const [input2FA, { error: mutationError }] = useMutation(INPUT_2FA, {
    onCompleted: ({ input2FA: success }) => {
      success ? getUserData() : setInvalidToken(true)
    }
  })

  const [getUserData, { error: queryError }] = useLazyQuery(GET_USER_DATA, {
    onCompleted: ({ userData }) => {
      setUserData(userData)
      history.push('/')
    }
  })

  const getErrorMsg = () => {
    if (mutationError || queryError) return 'Internal server error'
    if (twoFAField.length !== 6 && invalidToken)
      return 'The code should have 6 characters!'
    if (invalidToken) return 'Code is invalid. Please try again.'
    return null
  }

  return (
    <>
      <H2 className={classes.info}>
        Enter your two-factor authentication code
      </H2>
      <CodeInput
        name="2fa"
        value={twoFAField}
        onChange={handle2FAChange}
        numInputs={6}
        error={invalidToken}
        shouldAutoFocus
      />
      <div className={classes.twofaFooter}>
        {getErrorMsg() && (
          <P className={classes.errorMessage}>{getErrorMsg()}</P>
        )}
        <Button
          onClick={() => {
            if (twoFAField.length !== 6) {
              setInvalidToken(true)
              return
            }
            input2FA({
              variables: {
                username: clientField,
                password: passwordField,
                code: twoFAField,
                rememberMe: rememberMeField
              }
            })
          }}
          buttonClassName={classes.loginButton}>
          Login
        </Button>
      </div>
    </>
  )
}

export default Input2FAState