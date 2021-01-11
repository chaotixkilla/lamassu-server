import { makeStyles } from '@material-ui/core/styles'
import { startAssertion } from '@simplewebauthn/browser'
import axios from 'axios'
import React, { useState, useContext } from 'react'
import { useHistory } from 'react-router-dom'

import { AppContext } from 'src/App'
import { Button } from 'src/components/buttons'
import { Checkbox, TextInput } from 'src/components/inputs/base'
import { Label2, P } from 'src/components/typography'

import styles from './Login.styles'

const url =
  process.env.NODE_ENV === 'development' ? 'https://localhost:8070' : ''

const useStyles = makeStyles(styles)

const LoginFIDOState = ({
  clientField,
  onClientChange,
  rememberMeField,
  onRememberMeChange,
  STATES,
  handleLoginState
}) => {
  const classes = useStyles()
  const history = useHistory()
  const { setUserData } = useContext(AppContext)

  const [invalidLogin, setInvalidLogin] = useState(false)

  const handleClientChange = event => {
    onClientChange(event.target.value)
    setInvalidLogin(false)
  }

  const handleRememberMeChange = () => {
    onRememberMeChange(!rememberMeField)
  }

  const handleAssertion = () => {
    axios({
      method: 'POST',
      url: `${url}/api/generate-assertion-options`,
      data: {
        username: clientField
      },
      options: {
        withCredentials: true
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((res, err) => {
        if (err) return
        if (res) {
          const status = res.status
          if (status === 200) {
            startAssertion(res.data)
              .then(response => {
                verifyAssertion(response)
              })
              .catch(err => {
                console.log('startAssertion failed')
                console.log(err)
                setInvalidLogin(true)
              })
          }
        }
      })
      .catch(err => {
        if (err.response && err.response.data) {
          if (err.response.status === 403) setInvalidLogin(true)
        }
      })
  }

  const verifyAssertion = assResponse => {
    axios({
      url: `${url}/api/verify-assertion`,
      method: 'POST',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        username: clientField,
        rememberMe: rememberMeField,
        assertionRes: JSON.stringify(assResponse)
      }
    })
      .then((res, err) => {
        const status = res.status
        const verified = res.data.verified
        if (status === 200 && verified) {
          getUserData()
          history.push('/')
        }
      })
      .catch(err => {
        console.log('verifyAssertion failed')
        console.log(err)
      })
  }

  const getUserData = () => {
    axios({
      method: 'GET',
      url: `${url}/user-data`,
      withCredentials: true
    })
      .then(res => {
        if (res.status === 200) setUserData(res.data.user)
      })
      .catch(err => {
        if (err.status === 403) setUserData(null)
      })
  }

  return (
    <>
      <Label2 className={classes.inputLabel}>Client</Label2>
      <TextInput
        className={classes.input}
        error={invalidLogin}
        name="client-name"
        id="client-name"
        type="text"
        size="lg"
        onChange={handleClientChange}
        value={clientField}
      />
      <div className={classes.rememberMeWrapper}>
        <Checkbox
          className={classes.checkbox}
          id="remember-me"
          onChange={handleRememberMeChange}
          value={rememberMeField}
        />
        <Label2 className={classes.inputLabel}>Keep me logged in</Label2>
      </div>
      <div className={classes.footer}>
        {invalidLogin && (
          <P className={classes.errorMessage}>Invalid hardware credential.</P>
        )}
        <Button
          onClick={() => {
            handleLoginState(STATES.LOGIN)
          }}
          buttonClassName={classes.loginButton}>
          Regular Login
        </Button>
        <Button
          onClick={() => {
            handleAssertion()
          }}
          buttonClassName={classes.loginButton}>
          Login
        </Button>
      </div>
    </>
  )
}

export default LoginFIDOState
