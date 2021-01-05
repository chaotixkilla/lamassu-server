import { makeStyles } from '@material-ui/core/styles'
import axios from 'axios'
import React, { useState } from 'react'

import Modal from 'src/components/Modal'
import { Button } from 'src/components/buttons'
import { CodeInput } from 'src/components/inputs/base'
import { H2, Info3, P } from 'src/components/typography'

import styles from '../UserManagement.styles'

const url =
  process.env.NODE_ENV === 'development' ? 'https://localhost:8070' : ''

const useStyles = makeStyles(styles)

const Input2FAModal = ({ showModal, toggleModal, action, vars }) => {
  const classes = useStyles()

  const [twoFACode, setTwoFACode] = useState('')
  const [invalidCode, setInvalidCode] = useState(false)

  const handleCodeChange = value => {
    setTwoFACode(value)
    setInvalidCode(false)
  }

  const handleClose = () => {
    setTwoFACode('')
    setInvalidCode(false)
    toggleModal()
  }

  const handleActionConfirm = () => {
    axios({
      method: 'POST',
      url: `${url}/api/confirm2fa`,
      data: {
        code: twoFACode
      },
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((res, err) => {
        if (err) return
        if (res) {
          const status = res.status
          if (status === 200) {
            action()
            handleClose()
          }
        }
      })
      .catch(err => {
        const errStatus = err.response.status
        if (errStatus === 401) setInvalidCode(true)
      })
  }

  return (
    <>
      {showModal && (
        <Modal
          closeOnBackdropClick={true}
          width={600}
          height={400}
          handleClose={handleClose}
          open={true}>
          <H2 className={classes.modalTitle}>Confirm action</H2>
          <Info3 className={classes.info}>
            Please confirm this action by placing your two-factor authentication
            code below.
          </Info3>
          <CodeInput
            name="2fa"
            value={twoFACode}
            onChange={handleCodeChange}
            numInputs={6}
            error={invalidCode}
            containerStyle={classes.codeContainer}
            shouldAutoFocus
          />
          {invalidCode && (
            <P className={classes.errorMessage}>
              Code is invalid. Please try again.
            </P>
          )}
          <div className={classes.footer}>
            <Button onClick={handleActionConfirm}>Finish</Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export default Input2FAModal