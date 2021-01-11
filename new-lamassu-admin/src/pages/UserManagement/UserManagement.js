import { useQuery, useMutation } from '@apollo/react-hooks'
import { makeStyles, Box, Chip } from '@material-ui/core'
import { startAttestation, startAssertion } from '@simplewebauthn/browser'
import axios from 'axios'
import gql from 'graphql-tag'
import * as R from 'ramda'
import React, { useState, useContext } from 'react'

import { AppContext } from 'src/App'
import { Link } from 'src/components/buttons'
import { Switch } from 'src/components/inputs'
import TitleSection from 'src/components/layout/TitleSection'
import DataTable from 'src/components/tables/DataTable'

import styles from './UserManagement.styles'
import ChangeRoleModal from './modals/ChangeRoleModal'
import CreateUserModal from './modals/CreateUserModal'
import EnableUserModal from './modals/EnableUserModal'
import Input2FAModal from './modals/Input2FAModal'
import Reset2FAModal from './modals/Reset2FAModal'
import ResetPasswordModal from './modals/ResetPasswordModal'

const useStyles = makeStyles(styles)

const url =
  process.env.NODE_ENV === 'development' ? 'https://localhost:8070' : ''

const GET_USERS = gql`
  query users {
    users {
      id
      username
      role
      enabled
      last_accessed
      last_accessed_from
      last_accessed_address
    }
  }
`

const CHANGE_USER_ROLE = gql`
  mutation changeUserRole($id: ID!, $newRole: String!) {
    changeUserRole(id: $id, newRole: $newRole) {
      id
    }
  }
`

const TOGGLE_USER_ENABLE = gql`
  mutation toggleUserEnable($id: ID!) {
    toggleUserEnable(id: $id) {
      id
    }
  }
`

const Users = () => {
  const classes = useStyles()

  const { userData } = useContext(AppContext)

  const { data: userResponse } = useQuery(GET_USERS)

  const [changeUserRole] = useMutation(CHANGE_USER_ROLE, {
    refetchQueries: () => ['users']
  })

  const [toggleUserEnable] = useMutation(TOGGLE_USER_ENABLE, {
    refetchQueries: () => ['users']
  })

  const [userInfo, setUserInfo] = useState(null)

  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const toggleCreateUserModal = () =>
    setShowCreateUserModal(!showCreateUserModal)

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [resetPasswordUrl, setResetPasswordUrl] = useState('')
  const toggleResetPasswordModal = () =>
    setShowResetPasswordModal(!showResetPasswordModal)

  const [showReset2FAModal, setShowReset2FAModal] = useState(false)
  const [reset2FAUrl, setReset2FAUrl] = useState('')
  const toggleReset2FAModal = () => setShowReset2FAModal(!showReset2FAModal)

  const [showRoleModal, setShowRoleModal] = useState(false)
  const toggleRoleModal = () => setShowRoleModal(!showRoleModal)

  const [showEnableUserModal, setShowEnableUserModal] = useState(false)
  const toggleEnableUserModal = () =>
    setShowEnableUserModal(!showEnableUserModal)

  const [showInputConfirmModal, setShowInputConfirmModal] = useState(false)
  const toggleInputConfirmModal = () =>
    setShowInputConfirmModal(!showInputConfirmModal)

  const [action, setAction] = useState(null)

  const requestNewPassword = userID => {
    axios({
      method: 'POST',
      url: `${url}/api/resetpassword`,
      data: {
        userID: userID
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
            const token = res.data.token
            setResetPasswordUrl(
              `https://localhost:3001/resetpassword?t=${token.token}`
            )
            toggleResetPasswordModal()
          }
        }
      })
      .catch(err => {
        if (err) console.log('error')
      })
  }

  const requestNew2FA = userID => {
    axios({
      method: 'POST',
      url: `${url}/api/reset2fa`,
      data: {
        userID: userID
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
            const token = res.data.token
            setReset2FAUrl(`https://localhost:3001/reset2fa?t=${token.token}`)
            toggleReset2FAModal()
          }
        }
      })
      .catch(err => {
        if (err) console.log('error')
      })
  }

  const testFIDO = () => {
    axios({
      url: `${url}/api/generate-assertion-options-test`,
      method: 'POST',
      options: {
        withCredentials: true
      },
      data: {
        userID: userData.id
      }
    })
      .then((res, err) => {
        if (res.status === 200) {
          startAssertion(res.data)
            .then(response => {
              verifyAssertion(response)
            })
            .catch(err => {
              console.log('startAssertion failed')
              console.log(err)
            })
        }
      })
      .catch(err => {
        console.log('something went wrong')
        console.log(err)
      })
  }

  const verifyAssertion = assResponse => {
    axios({
      url: `${url}/api/verify-assertion-test`,
      method: 'POST',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        userID: userData.id,
        assertionRes: JSON.stringify(assResponse)
      }
    })
      .then((res, err) => {
        console.log(res.data)
      })
      .catch(err => {
        console.log('verifyAssertion failed')
        console.log(err)
      })
  }

  const configureFIDO = () => {
    axios({
      url: `${url}/api/generate-attestation-options`,
      method: 'POST',
      options: {
        withCredentials: true
      },
      data: {
        userID: userData.id
      }
    })
      .then((res, err) => {
        if (res.status === 200) {
          startAttestation(res.data)
            .then(response => {
              verifyAttestation(response)
            })
            .catch(err => {
              console.log('startAttestation failed')
              console.log(err)
            })
        }
      })
      .catch(err => {
        console.log('something went wrong')
        console.log(err)
      })
  }

  const verifyAttestation = attResponse => {
    axios({
      url: `${url}/api/verify-attestation`,
      method: 'POST',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        userID: userData.id,
        attestationRes: JSON.stringify(attResponse)
      }
    })
      .then((res, err) => {
        // do nothing
      })
      .catch(err => {
        console.log('something went wrong')
        console.log(err)
      })
  }

  const elements = [
    {
      header: 'Login',
      width: 257,
      textAlign: 'left',
      size: 'sm',
      view: u => {
        if (userData.id === u.id)
          return (
            <>
              {u.username}
              <Chip size="small" label="You" className={classes.chip} />
            </>
          )
        return u.username
      }
    },
    {
      header: 'Role',
      width: 105,
      textAlign: 'center',
      size: 'sm',
      view: u => {
        switch (u.role) {
          case 'user':
            return 'Regular'
          case 'superuser':
            return 'Superuser'
          default:
            return u.role
        }
      }
    },
    {
      header: '',
      width: 80,
      textAlign: 'center',
      size: 'sm',
      view: u => (
        <Switch
          disabled={userData.id === u.id}
          checked={u.role === 'superuser'}
          onClick={() => {
            setUserInfo(u)
            toggleRoleModal()
          }}
          value={u.role === 'superuser'}
        />
      )
    },
    {
      header: '',
      width: 25,
      textAlign: 'center',
      size: 'sm',
      view: u => {}
    },
    {
      header: 'Actions',
      width: 565,
      textAlign: 'left',
      size: 'sm',
      view: u => {
        return (
          <>
            <Chip
              size="small"
              label="Reset password"
              className={classes.actionChip}
              onClick={() => {
                setUserInfo(u)
                if (u.role === 'superuser') {
                  setAction(() => requestNewPassword.bind(null, u.id))
                  toggleInputConfirmModal()
                } else {
                  requestNewPassword(u.id)
                }
              }}
            />
            <Chip
              size="small"
              label="Reset 2FA"
              className={classes.actionChip}
              onClick={() => {
                setUserInfo(u)
                if (u.role === 'superuser') {
                  setAction(() => requestNew2FA.bind(null, u.id))
                  toggleInputConfirmModal()
                } else {
                  requestNew2FA(u.id)
                }
              }}
            />
          </>
        )
      }
    },
    {
      header: 'Enabled',
      width: 100,
      textAlign: 'center',
      size: 'sm',
      view: u => (
        <Switch
          disabled={userData.id === u.id}
          checked={u.enabled}
          onClick={() => {
            setUserInfo(u)
            toggleEnableUserModal()
          }}
          value={u.enabled}
        />
      )
    }
  ]

  return (
    <>
      <TitleSection title="User Management" />
      <Box
        marginBottom={3}
        marginTop={-5}
        className={classes.tableWidth}
        display="flex"
        justifyContent="flex-end">
        <Link color="primary" onClick={testFIDO}>
          Test FIDO
        </Link>
        <Link color="primary" onClick={configureFIDO}>
          Configure FIDO
        </Link>
        <Link color="primary" onClick={toggleCreateUserModal}>
          Add new user
        </Link>
      </Box>
      <DataTable elements={elements} data={R.path(['users'])(userResponse)} />
      <CreateUserModal
        showModal={showCreateUserModal}
        toggleModal={toggleCreateUserModal}
      />
      <ResetPasswordModal
        showModal={showResetPasswordModal}
        toggleModal={toggleResetPasswordModal}
        resetPasswordURL={resetPasswordUrl}
        user={userInfo}
      />
      <Reset2FAModal
        showModal={showReset2FAModal}
        toggleModal={toggleReset2FAModal}
        reset2FAURL={reset2FAUrl}
        user={userInfo}
      />
      <ChangeRoleModal
        showModal={showRoleModal}
        toggleModal={toggleRoleModal}
        user={userInfo}
        confirm={changeUserRole}
        inputConfirmToggle={toggleInputConfirmModal}
        setAction={setAction}
      />
      <EnableUserModal
        showModal={showEnableUserModal}
        toggleModal={toggleEnableUserModal}
        user={userInfo}
        confirm={toggleUserEnable}
        inputConfirmToggle={toggleInputConfirmModal}
        setAction={setAction}
      />
      <Input2FAModal
        showModal={showInputConfirmModal}
        toggleModal={toggleInputConfirmModal}
        action={action}
      />
    </>
  )
}

export default Users
